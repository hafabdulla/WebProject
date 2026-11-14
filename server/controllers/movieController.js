const TMDB_BASE = "https://api.themoviedb.org/3";

// In below genres: X|Y; X And Y both are TMDB's own genre ids, ege., 35 => comedy, 10751 => family
const MOODS = {
  feelgood: {
    label: "Feel good",
    genres: "35|10751",
    minRating: 6.5,
    minVotes: 1000,
    sortBy: "vote_average.desc",
  },
  intense: {
    label: "Intense",
    genres: "53|80",
    minRating: 6,
    minVotes: 1000,
    sortBy: "vote_average.desc",
  },
  heartbreak: {
    label: "Heartbreak",
    genres: "18|10749",
    minRating: 7,
    minVotes: 1000,
    sortBy: "vote_average.desc",
  },
  mindbending: {
    label: "Mind bending",
    genres: "878|9648",
    minRating: 6.5,
    minVotes: 1000,
    sortBy: "vote_average.desc",
  },
  switchoff: {
    label: "Switch off",
    genres: "28|12",
    minRating: 0,
    minVotes: 100,
    sortBy: "popularity.desc",
  },
};

const tmdbGet = async (path, params) => {
  const query = new URLSearchParams(params);
  query.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetch(TMDB_BASE + path + "?" + query.toString());
  if (!response.ok) {
    const error = new Error("TMDB request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
};

const sendError = (res, err) => {
  if (err.status === 404) {
    return res.status(404).json({ message: "Movie Not Found" });
  }
  res.status(500).json({ message: err.message });
};
const getPopular = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await tmdbGet("/movie/popular", { page: page });
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};
//the TMDB path for each category we offer on the homepage
const CATEGORY_PATHS = {
  popular: "/movie/popular",
  trending: "/trending/movie/week",
  top_rated: "/movie/top_rated",
  upcoming: "/movie/upcoming",
};
const getCategory = async (req, res) => {
  try {
    const path = CATEGORY_PATHS[req.params.name];
    if (!path) {
      return res.status(400).json({ message: "Unknown Category" });
    }
    const page = req.query.page || 1;
    const data = await tmdbGet(path, { page: page });
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};
const searchMovies = async (req, res) => {
  try {
    const text = req.query.query;
    if (!text) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const page = req.query.page || 1;
    const data = await tmdbGet("/search/movie", { query: text, page: page });
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

const getGenres = async (req, res) => {
  try {
    const data = await tmdbGet("/genre/movie/list", {});
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

const discoverMovies = async (req, res) => {
  try {
    const params = { page: req.query.page || 1, sort_by: "popularity.desc" };
    if (req.query.genre) {
      params.with_genres = req.query.genre;
    }
    const data = await tmdbGet("/discover/movie", params);
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

const getMoods = (req, res) => {
    const list = [];
    const keys = Object.keys(MOODS)
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        list.push({value: key, label: MOODS[key].label});
    }
    res.status(200).json(list);
}

const getMoodRecommendations = async (req, res) =>{
    try{
        const mood = MOODS[req.params.mood];
        if(!mood){
            return res.status(400).json({message: "Unknown Mood"});
        }
        const params = {
            page: req.query.page || 1,
            with_genres: mood.genres,
            sort_by: mood.sortBy,
            "vote_count.gte": mood.minVotes,
            include_adult: false,
        };

        if(mood.minRating >0 ){
            params["vote_average.gte"] = mood.minRating
        }
        const data = await tmdbGet("/discover/movie", params);

        res.status(200).json({mood: req.params.mood,
            label: mood.label,
            page: data.page,
            total_pages: data.total_pages,
            results: data.results,
        })
    }catch(err){
        sendError(res,err);
    }
}

const getMovieDetails = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }
    const data = await tmdbGet("/movie/" + id, {
      append_to_response: "credits,videos",
    });
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getPopular,
  getCategory,
  searchMovies,
  getGenres,
  discoverMovies,
  getMoods,
  getMoodRecommendations,
  getMovieDetails,
};
