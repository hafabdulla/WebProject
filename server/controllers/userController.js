const mongoose = require("mongoose");
const User = require("../models/User");
const Friendship = require("../models/Friendship");

// a typed search like "a.b" must match the text "a.b", not "any letter" for the dot
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/users/search?q=ali  - find people by name (or by their exact email).
// Only names are sent back, never emails. Each result also says how I am
// connected to that person: "none", "friends", "sent" or "received".
const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(400).json({ message: "Type at least 2 letters to search" });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { email: q.toLowerCase() },
      ],
    })
      .select("name")
      .sort({ name: 1 })
      .limit(20);

    // one query for all my friendships with the people found
    const ids = [];
    for (let i = 0; i < users.length; i++) {
      ids.push(users[i]._id);
    }
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user.id, recipient: { $in: ids } },
        { recipient: req.user.id, requester: { $in: ids } },
      ],
    });

    const results = [];
    for (let i = 0; i < users.length; i++) {
      const id = users[i]._id.toString();
      let status = "none";
      let requestId = null;
      for (let j = 0; j < friendships.length; j++) {
        const f = friendships[j];
        const requester = f.requester.toString();
        const recipient = f.recipient.toString();
        if (requester === id || recipient === id) {
          requestId = f._id;
          if (f.status === "accepted") {
            status = "friends";
          } else if (requester === req.user.id) {
            status = "sent";
          } else {
            status = "received";
          }
        }
      }
      results.push({ _id: users[i]._id, name: users[i].name, status, requestId });
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:id  - a user's public info (name and join date only)
const getPublicUser = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id).select("name avatar createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friendCount = await Friendship.countDocuments({
      status: "accepted",
      $or: [{ requester: user._id }, { recipient: user._id }],
    });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      friendCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchUsers, getPublicUser };
