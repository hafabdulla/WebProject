const mongoose = require("mongoose");

// One review = one user's rating (1 to 5) and optional text for one movie
const reviewSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },      // id of the user who wrote it
    userName: { type: String, required: true },  // saved copy of the name, so we can show it
    movieId: { type: Number, required: true },   // the movie's id (from TMDB)
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: "" },
    likes: { type: [String], default: [] },      // ids of the users who liked this review
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);