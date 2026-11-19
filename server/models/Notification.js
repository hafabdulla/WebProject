const mongoose = require("mongoose");

// One in-app notification for one user, for example "Ali sent you a friend request"
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who gets it
    type: {
      type: String,
      enum: ["friend_request", "friend_accepted", "message"],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who caused it
    text: { type: String, required: true },
    link: { type: String, default: "" }, // the page to open when it is clicked
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// newest first; updatedAt also changes when a message notification gets a new message
notificationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
