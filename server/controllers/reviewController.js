const Review = require("../models/Review");

// GET /api/reviews/movie/:movieId  - all reviews of one movie, plus the average
const getMovieReviews = async (req, res) => {
  try {
    // populate() replaces the user id with the user's data.
    // We ask for the name only, because this route is public (no email or password)
    const reviews = await Review.find({ movieId: req.params.movieId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    let total = 0;
    for (let i = 0; i < reviews.length; i++) {
      total = total + reviews[i].rating;
    }

    let average = 0;
    if (reviews.length > 0) {
      average = Math.round((total / reviews.length) * 10) / 10;
    }

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

    // One review per user per movie. Note: a compound unique index on (user, movieId)
    // would be the stronger fix, because two requests at the same moment can both pass this check.
    const exists = await Review.findOne({ movieId, user: req.user.id });
    if (exists) {
      return res.status(400).json({ message: "You already reviewed this movie" });
    }

    const review = await Review.create({
      movieId,
      rating,
      text,
      user: req.user.id,
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

    // review.user is an ObjectId, so turn it into text before comparing
    if (review.user.toString() !== req.user.id) {
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

    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
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

    // go through the likes: keep everybody else, and remember if this user was already there
    const newLikes = [];
    let alreadyLiked = false;
    for (let i = 0; i < review.likes.length; i++) {
      if (review.likes[i] === req.user.id) {
        alreadyLiked = true;
      } else {
        newLikes.push(review.likes[i]);
      }
    }

    // if they had not liked it yet, add their like
    if (!alreadyLiked) {
      newLikes.push(req.user.id);
    }

    review.likes = newLikes;
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