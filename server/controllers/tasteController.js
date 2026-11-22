const Review = require("../models/Review");
const Watchlist = require("../models/Watchlist");
const GenreResume = require("../models/GenreResume");
const { getTaste } = require("../utils/taste");
const { analyse, labelOf } = require("../utils/sentiment");
const { getGenreNames, discover } = require("../utils/tmdb");

const MAX_TEXT_LENGTH = 2000;
// how many suggestions we try to give
const WANTED = 12;
// how many of the user's favourite genres we search in
const TOP_GENRES = 3;

// GET /api/taste  - how I feel about each genre, and which ones are paused
const getMyTaste = async (req, res) => {
  try {
    const taste = await getTaste(req.user.id);
    res.status(200).json(taste);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/taste/suggestions  - movies from the genres I like, never from paused ones,
// and never movies I already reviewed or have in my watchlist
const getSuggestions = async (req, res) => {
  try {
    const taste = await getTaste(req.user.id);

    const liked = [];
    const paused = [];
    for (let i = 0; i < taste.genres.length; i++) {
      const genre = taste.genres[i];
      if (genre.status === "liked" && liked.length < TOP_GENRES) {
        liked.push(genre);
      }
      if (genre.status === "paused") {
        paused.push(genre);
      }
    }

    const basedOn = liked.map((genre) => genre.name);
    const avoiding = paused.map((genre) => genre.name);

    if (liked.length === 0) {
      return res.status(200).json({
        basedOn,
        avoiding,
        results: [],
        message: "Rate and review a few movies you enjoyed, and we will pick movies for you.",
      });
    }

    // movies the user already knows about
    const seen = {};
    const reviews = await Review.find({ user: req.user.id }).select("movieId");
    for (let i = 0; i < reviews.length; i++) {
      seen[reviews[i].movieId] = true;
    }
    const saved = await Watchlist.find({ user: req.user.id }).select("movieId");
    for (let i = 0; i < saved.length; i++) {
      seen[saved[i].movieId] = true;
    }

    const params = {
      // "|" means "any of these genres"
      with_genres: liked.map((genre) => genre.id).join("|"),
      sort_by: "popularity.desc",
      "vote_average.gte": 6.5,
      "vote_count.gte": 300,
      include_adult: false,
    };
    if (paused.length > 0) {
      // "," means "none of these genres"
      params.without_genres = paused.map((genre) => genre.id).join(",");
    }

    const results = [];
    // look through up to 3 pages, because some movies are skipped
    for (let page = 1; page <= 3 && results.length < WANTED; page++) {
      params.page = page;
      const data = await discover(params);
      for (let i = 0; i < data.results.length && results.length < WANTED; i++) {
        const movie = data.results[i];
        if (seen[movie.id]) {
          continue;
        }
        // say which of the liked genres it matched
        for (let k = 0; k < liked.length; k++) {
          if (movie.genre_ids.includes(liked[k].id)) {
            movie.reason = "Because you like " + liked[k].name;
            break;
          }
        }
        results.push(movie);
      }
      if (page >= data.total_pages) {
        break;
      }
    }

    res.status(200).json({ basedOn, avoiding, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/taste/resume/:genreId  - bring a paused genre back before its time is up
const resumeGenre = async (req, res) => {
  try {
    const genreId = Number(req.params.genreId);
    if (!Number.isInteger(genreId) || genreId <= 0) {
      return res.status(400).json({ message: "Invalid genre ID" });
    }

    const names = await getGenreNames();
    if (!names[genreId]) {
      return res.status(404).json({ message: "Genre not found" });
    }

    await GenreResume.findOneAndUpdate(
      { user: req.user.id, genreId: genreId },
      { resumedAt: new Date() },
      { upsert: true }
    );
    res.status(200).json({ message: names[genreId] + " is back in your suggestions" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/taste/analyse  { text }  - how positive a piece of text sounds.
// The review form uses it to show the tone while you type.
const analyseText = (req, res) => {
  const text = req.body.text;
  if (typeof text !== "string") {
    return res.status(400).json({ message: "Text is required" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res
      .status(400)
      .json({ message: "Text can be at most " + MAX_TEXT_LENGTH + " characters" });
  }
  const result = analyse(text);
  res.status(200).json({ score: result.score, label: labelOf(result.score), words: result.words });
};

module.exports = { getMyTaste, getSuggestions, resumeGenre, analyseText };
