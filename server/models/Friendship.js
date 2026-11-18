const mongoose = require("mongoose");

// One document = one friendship between two users.
// It starts as a "pending" request from requester to recipient,
// and becomes "accepted" when the recipient accepts it.
// A declined request, a cancelled request or a removed friend is simply deleted.
const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted"], default: "pending" },
  },
  { timestamps: true }
);

// the same request can not be sent twice
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model("Friendship", friendshipSchema);
