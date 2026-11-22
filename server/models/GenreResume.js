const mongoose = require("mongoose");

// When a genre is paused for a user (they kept disliking it), they can press
// "Resume" to bring it back early. This remembers when they did that.
const genreResumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  genreId: { type: Number, required: true },
  resumedAt: { type: Date, required: true },
});

// one row per user per genre
genreResumeSchema.index({ user: 1, genreId: 1 }, { unique: true });

module.exports = mongoose.model("GenreResume", genreResumeSchema);
