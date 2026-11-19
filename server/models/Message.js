const mongoose = require("mongoose");

// One chat message from one user to another
const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    read: { type: Boolean, default: false }, // has "to" seen it yet?
  },
  { timestamps: true }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, read: 1 });

module.exports = mongoose.model("Message", messageSchema);
