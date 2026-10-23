const Review = require("../models/Review");
const User = require("../models/User");

// GET /api/reviews/movie/:movieId  - all reviews of one movie, plus the average
const getMovieReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId });

    let total = 0;
    reviews.forEach((review) => {
      total += review.rating;
    });
    const average = reviews.length
      ? Math.round((total / reviews.length) * 10) / 10
      : 0;

    res.status(200).json({ average, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reviews  - write a review (logged in)
const createReview = async (req, res) => {
  try {
    const { movieId, rating, text } = req.body;
    if (!movieId || !rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "movieId and a rating from 1 to 5 are required" });
    }

    const exists = await Review.findOne({ movieId, user: req.user.id });
    if (exists) {
      return res.status(400).json({ message: "You already reviewed this movie" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const review = await Review.create({
      movieId,
      rating,
      text,
      user: req.user.id,
      userName: user.name,
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/reviews/:id  - edit your own review
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.user !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own review" });
    }

    const { rating, text } = req.body;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be from 1 to 5" });
      }
      review.rating = rating;
    }
    if (text !== undefined) {
      review.text = text;
    }

    await review.save();
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reviews/:id  - delete your own review (an admin can delete any)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.user !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own review" });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reviews/:id/like  - like a review, or take the like back
const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.likes.includes(req.user.id)) {
      review.likes = review.likes.filter((id) => id !== req.user.id);
    } else {
      review.likes.push(req.user.id);
    }

    await review.save();
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMovieReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
};