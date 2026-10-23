const express = require("express");
const {
  getMovieReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/movie/:movieId", getMovieReviews);
router.post("/", protect, createReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
router.post("/:id/like", protect, likeReview);

module.exports = router;