const express = require('express')
const {
  getPopular,
  getCategory,
  searchMovies,
  getGenres,
  discoverMovies,
  getMovieDetails,
  getMoods,
  getMoodRecommendations,
} = require("../controllers/movieController")

const router = express.Router();
router.get("/popular", getPopular);
router.get("/category/:name", getCategory);
router.get("/search", searchMovies);
router.get("/genres", getGenres);
router.get("/discover", discoverMovies);
router.get("/moods", getMoods);
router.get("/mood/:mood", getMoodRecommendations);
router.get("/:id", getMovieDetails);

module.exports = router
