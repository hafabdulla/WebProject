const mongoose = require("mongoose");

// One movie inside a list. The title, poster, date and rating are copied from TMDB
// when the movie is added, so showing a list does not need a TMDB call per movie.
const listItemSchema = new mongoose.Schema(
  {
    movieId: { type: Number, required: true },
    title: { type: String, default: "" },
    posterPath: { type: String, default: "" },
    releaseDate: { type: String, default: "" },
    voteAverage: { type: Number, default: 0 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A friend the owner shared the list with. "invited" until they accept.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["invited", "accepted"], default: "invited" },
  },
  { _id: false }
);

// A named list of movies, for example "Weekend horror marathon".
// The owner and every accepted member can add and remove movies and rename it.
const listSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: "", maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [memberSchema], default: [] },
    items: { type: [listItemSchema], default: [] },
  },
  { timestamps: true }
);

listSchema.index({ owner: 1 });
listSchema.index({ "members.user": 1 });

module.exports = mongoose.model("List", listSchema);
