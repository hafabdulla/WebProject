const express = require("express");
const {
  getWatchlist,
  saveToWatchlist,
  removeFromWatchlist,
} = require("../controllers/watchlistController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getWatchlist);
router.post("/", protect, saveToWatchlist);
router.delete("/:movieId", protect, removeFromWatchlist);

module.exports = router;