const mongoose = require("mongoose");
const Message = require("../models/Message");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { emitToUser } = require("../socket");
const notify = require("../utils/notify");

const PAGE_SIZE = 50;

const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

// true if the two users are friends (only friends can chat)
const areFriends = async (userA, userB) => {
  const friendship = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
  return friendship !== null;
};

// GET /api/chat/conversations  - every friend, with the last message and unread count
const getConversations = async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id);

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requester: me }, { recipient: me }],
    })
      .populate("requester", "name")
      .populate("recipient", "name");

    const conversations = [];
    for (let i = 0; i < friendships.length; i++) {
      const f = friendships[i];
      if (!f.requester || !f.recipient) {
        continue;
      }
      let friend = f.requester;
      if (f.requester._id.toString() === req.user.id) {
        friend = f.recipient;
      }

      const lastMessage = await Message.findOne({
        $or: [
          { from: me, to: friend._id },
          { from: friend._id, to: me },
        ],
      }).sort({ createdAt: -1 });

      const unread = await Message.countDocuments({ from: friend._id, to: me, read: false });

      conversations.push({
        user: { _id: friend._id, name: friend.name },
        lastMessage,
        unread,
      });
    }

    // newest conversation first; friends you never talked to go last
    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/chat/:userId/messages?before=<date>  - the messages with one friend, oldest first.
// Without "before" it returns the newest 50; with it, the 50 before that time.
const getMessages = async (req, res) => {
  try {
    const other = req.params.userId;
    if (!isValidId(other)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(other).select("name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!(await areFriends(req.user.id, other))) {
      return res.status(403).json({ message: "You can only chat with your friends" });
    }

    const filter = {
      $or: [
        { from: req.user.id, to: other },
        { from: other, to: req.user.id },
      ],
    };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (isNaN(before.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }
      filter.createdAt = { $lt: before };
    }

    const newestFirst = await Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1);
    const hasMore = newestFirst.length > PAGE_SIZE;
    const messages = newestFirst.slice(0, PAGE_SIZE).reverse();

    res.status(200).json({ user: { _id: user._id, name: user.name }, messages, hasMore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/chat/:userId/messages  body: { text }  - send a message to a friend
const sendMessage = async (req, res) => {
  try {
    const other = req.params.userId;
    if (!isValidId(other)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Message can not be empty" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ message: "Message can be at most 2000 characters" });
    }
    if (!(await areFriends(req.user.id, other))) {
      return res.status(403).json({ message: "You can only chat with your friends" });
    }

    const message = await Message.create({ from: req.user.id, to: other, text });

    // push it to the friend's open tabs, and to my other tabs too
    emitToUser(other, "message", message);
    emitToUser(req.user.id, "message", message);
    await notify(other, "message", req.user.id, "/chat/" + req.user.id);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/chat/:userId/read  - mark every message from this friend as read
const markRead = async (req, res) => {
  try {
    const other = req.params.userId;
    if (!isValidId(other)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const result = await Message.updateMany(
      { from: other, to: req.user.id, read: false },
      { read: true }
    );
    // reading the chat also reads the "X sent you a message" notification
    await Notification.updateMany(
      { user: req.user.id, type: "message", actor: other, read: false },
      { read: true },
      { timestamps: false }
    );
    // tell the friend's tabs that I have seen their messages,
    // and my own tabs to update their unread counts
    emitToUser(other, "messages_read", { by: req.user.id });
    emitToUser(req.user.id, "counts_changed", {});
    res.status(200).json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/chat/unread  - how many unread messages I have in total
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.user.id, read: false });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getConversations, getMessages, sendMessage, markRead, getUnreadCount };
