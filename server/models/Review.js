const mongoose = require("mongoose");

// One review = one user's rating (1 to 5) and optional text for one movie
const reviewSchema = new mongoose.Schema(
  {
    // points to the user who wrote the review (a real id, not text)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movieId: { type: Number, required: true },   // the movie's id (from TMDB)
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: "" },
    likes: { type: [String], default: [] },      // ids (as text) of the users who liked this review
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);