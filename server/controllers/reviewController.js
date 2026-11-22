const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");
const { analyse } = require("../utils/sentiment");
const { getMovieBasics } = require("../utils/tmdb");

const MAX_TEXT_LENGTH = 2000;

// true if the text looks like a MongoDB id. Without this check, a bad id makes
// findById() throw a CastError and the server answers 500 instead of 400/404.
const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

// a rating must be a whole number from 1 to 5
const isValidRating = (rating) => {
  const number = Number(rating);
  return Number.isInteger(number) && number >= 1 && number <= 5;
};

// works out the average rating of a list of reviews, rounded to 1 decimal
const averageOf = (reviews) => {
  if (reviews.length === 0) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < reviews.length; i++) {
    total = total + reviews[i].rating;
  }
  return Math.round((total / reviews.length) * 10) / 10;
};

// GET /api/reviews/movie/:movieId  - all reviews of one movie, plus the average
const getMovieReviews = async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    // populate() replaces the user id with the user's data.
    // We ask for the name only, because this route is public (no email or password)
    const reviews = await Review.find({ movieId: movieId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    // reviews written before sentiment was added get their score now (and keep it)
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].sentiment === null) {
        reviews[i].sentiment = analyse(reviews[i].text).score;
        await Review.updateOne(
          { _id: reviews[i]._id },
          { sentiment: reviews[i].sentiment },
          { timestamps: false }
        );
      }
    }

    res.status(200).json({ average: averageOf(reviews), count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/mine  - all reviews written by the logged in user
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/user/:userId  - all reviews written by one user (public)
const getUserReviews = async (req, res) => {
  try {
    if (!isValidId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.userId).select("name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const reviews = await Review.find({ user: user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      user: { _id: user._id, name: user.name },
      average: averageOf(reviews),
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/:id  - one review (public)
const getReview = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const review = await Review.findById(req.params.id).populate("user", "name");
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews?page=1&limit=20&movieId=550&userId=...  - every review (admin only),
// newest first, for the admin dashboard
const getAllReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = {};
    if (req.query.movieId) {
      filter.movieId = Number(req.query.movieId);
      if (!Number.isInteger(filter.movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
    }
    if (req.query.userId) {
      if (!isValidId(req.query.userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      filter.user = req.query.userId;
    }

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      page,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      total,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reviews  - write a review (logged in)
const createReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    const movieId = Number(req.body.movieId);

    if (!Number.isInteger(movieId) || movieId <= 0) {
      return res.status(400).json({ message: "A valid movieId is required" });
    }
    if (!isValidRating(rating)) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }
    if (text !== undefined && typeof text !== "string") {
      return res.status(400).json({ message: "Review text must be text" });
    }
    if (text && text.length > MAX_TEXT_LENGTH) {
      return res
        .status(400)
        .json({ message: "Review text can be at most " + MAX_TEXT_LENGTH + " characters" });
    }

    // One review per user per movie. The unique index in the Review model also
    // blocks this, even if two requests arrive at the same moment.
    const exists = await Review.findOne({ movieId, user: req.user.id });
    if (exists) {
      return res.status(400).json({ message: "You already reviewed this movie" });
    }

    // the movie's genres, so we can learn which genres this user likes.
    // If TMDB is down the review is still saved; the genres are filled in later.
    let genreIds = [];
    try {
      const movie = await getMovieBasics(movieId);
      if (movie) {
        genreIds = movie.genreIds;
      }
    } catch (err) {
      genreIds = [];
    }

    const review = await Review.create({
      movieId,
      rating: Number(rating),
      text,
      user: req.user.id,
      sentiment: analyse(text).score,
      genreIds: genreIds,
    });
    res.status(201).json(review);
  } catch (err) {
    // 11000 = MongoDB "duplicate key", from the unique (user, movieId) index
    if (err.code === 11000) {
      return res.status(400).json({ message: "You already reviewed this movie" });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/reviews/:id  - edit your own review
const updateReview = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

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
      if (!isValidRating(rating)) {
        return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
      }
      review.rating = Number(rating);
    }
    if (text !== undefined) {
      if (typeof text !== "string") {
        return res.status(400).json({ message: "Review text must be text" });
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return res
          .status(400)
          .json({ message: "Review text can be at most " + MAX_TEXT_LENGTH + " characters" });
      }
      review.text = text;
      review.sentiment = analyse(text).score;
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
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

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
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

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
  getMyReviews,
  getUserReviews,
  getReview,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
};
