const express = require("express");
const {
  getMyTaste,
  getSuggestions,
  resumeGenre,
  analyseText,
} = require("../controllers/tasteController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getMyTaste);
router.get("/suggestions", protect, getSuggestions);
router.post("/resume/:genreId", protect, resumeGenre);
router.post("/analyse", protect, analyseText);

module.exports = router;
