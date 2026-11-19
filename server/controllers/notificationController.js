const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { emitToUser } = require("../socket");

// GET /api/notifications  - my newest 30 notifications and how many are unread
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(30);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/read-all  - mark all my notifications as read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true },
      { timestamps: false } // reading must not move them to the top
    );
    emitToUser(req.user.id, "counts_changed", {}); // update my other open tabs
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/:id/read  - mark one notification as read
const markOneRead = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { returnDocument: "after", timestamps: false }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getNotifications, markAllRead, markOneRead };
