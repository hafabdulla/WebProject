const mongoose = require("mongoose");

// One reply to a forum thread
const replySchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: "Thread", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

replySchema.index({ thread: 1, createdAt: 1 });

module.exports = mongoose.model("Reply", replySchema);
