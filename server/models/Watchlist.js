const mongoose = require("mongoose");

// One item = one movie in one user's watchlist
const watchlistSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    movieId: { type: Number, required: true },
    status: { type: String, enum: ["want", "watched"], default: "want" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Watchlist", watchlistSchema);