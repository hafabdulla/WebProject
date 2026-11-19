const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitToUser } = require("../socket");

const TEXTS = {
  friend_request: " sent you a friend request",
  friend_accepted: " accepted your friend request",
  message: " sent you a message",
};

// Saves a notification for userId and pushes it to their open tabs right away.
// A failed notification must never break the action that caused it,
// so errors are only logged.
const notify = async (userId, type, actorId, link) => {
  try {
    const actor = await User.findById(actorId).select("name");
    if (!actor) {
      return;
    }
    const text = actor.name + TEXTS[type];

    let notification;
    if (type === "message") {
      // one unread "message" notification per sender, instead of one per message.
      // Updating it also changes its updatedAt, which moves it to the top of the list.
      notification = await Notification.findOneAndUpdate(
        { user: userId, type: "message", actor: actorId, read: false },
        { text, link },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } else {
      notification = await Notification.create({ user: userId, type, actor: actorId, text, link });
    }

    emitToUser(userId, "notification", notification);
  } catch (err) {
    console.error("Could not send notification:", err.message);
  }
};

module.exports = notify;
