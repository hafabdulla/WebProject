const Review = require("../models/Review");
const GenreResume = require("../models/GenreResume");
const { analyse } = require("./sentiment");
const { getMovieBasics, getGenreNames } = require("./tmdb");

// a genre is paused for this many days after the user's last bad review of it
const PAUSE_DAYS = 30;
// a feeling at or above this is "liked", at or below the minus is "disliked"
const LIKE_LEVEL = 0.25;
// this many bad reviews in a row in one genre pauses it
const DISLIKES_TO_PAUSE = 2;

const DAY = 24 * 60 * 60 * 1000;

// How the user felt about one movie, from -1 (hated it) to 1 (loved it).
// The stars always count. If the text says something, it counts half.
const feelingOf = (review) => {
  const fromStars = (review.rating - 3) / 2; // 1 star = -1, 3 stars = 0, 5 stars = 1

  let fromText = review.sentiment;
  if (fromText === null || fromText === undefined) {
    fromText = analyse(review.text).score;
  }
  if (fromText === 0) {
    return fromStars;
  }
  return Math.round((fromStars * 0.5 + fromText * 0.5) * 100) / 100;
};

// Old reviews do not know their movie's genres yet: ask TMDB and save them.
// If TMDB does not answer, we just try again next time.
const fillMissingGenres = async (reviews) => {
  for (let i = 0; i < reviews.length; i++) {
    if (reviews[i].genreIds.length > 0) {
      continue;
    }
    try {
      const movie = await getMovieBasics(reviews[i].movieId);
      if (movie && movie.genreIds.length > 0) {
        reviews[i].genreIds = movie.genreIds;
        // timestamps: false, so the review does not look "edited"
        await Review.updateOne(
          { _id: reviews[i]._id },
          { genreIds: movie.genreIds },
          { timestamps: false }
        );
      }
    } catch (err) {
      // leave it for next time
    }
  }
};

// Works out how one user feels about each genre, from their reviews.
// Gives back { reviewCount, genres: [...] }, best liked genre first. Each genre is
//   { id, name, count, average, status, pausedUntil }
// status is "liked", "mixed", "disliked" or "paused" (disliked again and again lately)
const getTaste = async (userId) => {
  const reviews = await Review.find({ user: userId }).sort({ createdAt: 1 });
  await fillMissingGenres(reviews);

  let names = {};
  try {
    names = await getGenreNames();
  } catch (err) {
    // without names we still show the numbers
  }

  // when the user pressed "Resume" on a genre
  const resumes = await GenreResume.find({ user: userId });
  const resumedAt = {};
  for (let i = 0; i < resumes.length; i++) {
    resumedAt[resumes[i].genreId] = resumes[i].resumedAt;
  }

  // group the feelings by genre, oldest review first
  const byGenre = {};
  for (let i = 0; i < reviews.length; i++) {
    const feeling = feelingOf(reviews[i]);
    for (let g = 0; g < reviews[i].genreIds.length; g++) {
      const id = reviews[i].genreIds[g];
      if (!byGenre[id]) {
        byGenre[id] = [];
      }
      byGenre[id].push({ feeling: feeling, date: reviews[i].createdAt });
    }
  }

  const genres = [];
  const ids = Object.keys(byGenre);
  for (let i = 0; i < ids.length; i++) {
    const id = Number(ids[i]);
    const feelings = byGenre[ids[i]];

    let total = 0;
    for (let k = 0; k < feelings.length; k++) {
      total = total + feelings[k].feeling;
    }
    const average = Math.round((total / feelings.length) * 100) / 100;

    let status = "mixed";
    if (average >= LIKE_LEVEL) {
      status = "liked";
    } else if (average <= -LIKE_LEVEL) {
      status = "disliked";
    }

    // were the last few reviews of this genre all bad?
    let pausedUntil = null;
    if (feelings.length >= DISLIKES_TO_PAUSE) {
      let allBad = true;
      for (let k = feelings.length - DISLIKES_TO_PAUSE; k < feelings.length; k++) {
        if (feelings[k].feeling > -LIKE_LEVEL) {
          allBad = false;
        }
      }
      const lastDate = feelings[feelings.length - 1].date;
      const until = new Date(lastDate.getTime() + PAUSE_DAYS * DAY);
      const resumedAfter = resumedAt[id] && resumedAt[id] > lastDate;
      if (allBad && until > new Date() && !resumedAfter) {
        status = "paused";
        pausedUntil = until;
      }
    }

    genres.push({
      id: id,
      name: names[id] || "Genre " + id,
      count: feelings.length,
      average: average,
      status: status,
      pausedUntil: pausedUntil,
    });
  }

  // best liked first; with the same feeling, the one reviewed more often first
  genres.sort((a, b) => b.average - a.average || b.count - a.count);

  return { reviewCount: reviews.length, genres: genres };
};

module.exports = { getTaste, feelingOf, PAUSE_DAYS };
