const express = require('express')
const {
  getPopular,
  getCategory,
  searchMovies,
  getGenres,
  discoverMovies,
  getMovieDetails,
} = require("../controllers/movieController")

const router = express.Router();
router.get("/popular", getPopular);
router.get("/category/:name", getCategory);
router.get("/search", searchMovies);
router.get("/genres", getGenres);
router.get("/discover", discoverMovies);
router.get("/:id", getMovieDetails);

module.exports = router

