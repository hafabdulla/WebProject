const express = require("express");
const {
  getMovieReviews,
  getMyReviews,
  getUserReviews,
  getReview,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
} = require("../controllers/reviewController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// the fixed paths (/mine, /movie/..., /user/...) must come before "/:id",
// otherwise Express would treat "mine" as a review id
router.get("/", protect, adminOnly, getAllReviews);
router.get("/mine", protect, getMyReviews);
router.get("/movie/:movieId", getMovieReviews);
router.get("/user/:userId", getUserReviews);
router.get("/:id", getReview);
router.post("/", protect, createReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
router.post("/:id/like", protect, likeReview);

module.exports = router;
