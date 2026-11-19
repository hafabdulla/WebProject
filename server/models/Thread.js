const mongoose = require("mongoose");

// One thread = one discussion topic on a forum board.
// The replies are saved in their own collection (see Reply.js).
const threadSchema = new mongoose.Schema(
  {
    board: { type: String, required: true },   // a key from BOARDS in forumController
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    replyCount: { type: Number, default: 0 },
    // when the thread was started or last replied to, so active threads show first
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

threadSchema.index({ board: 1, lastActivityAt: -1 });

module.exports = mongoose.model("Thread", threadSchema);
