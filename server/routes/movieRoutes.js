const express = require('express')
const {
  getPopular,
  searchMovies,
  getGenres,
  discoverMovies,
  getMovieDetails,
  getTrending,
  getTopRated,
  getUpcoming,
} = require("../controllers/movieController")

const router = express.Router();
router.get("/popular", getPopular);
router.get("/trending", getTrending);
router.get("/top-rated", getTopRated);
router.get("/upcoming", getUpcoming);
router.get("/search", searchMovies);
router.get("/genres", getGenres);
router.get("/discover", discoverMovies);
router.get("/:id", getMovieDetails);

module.exports = router