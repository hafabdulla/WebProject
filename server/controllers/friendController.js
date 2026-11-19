const mongoose = require("mongoose");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const notify = require("../utils/notify");

const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

// finds the friendship (pending or accepted) between two users, in either direction
const findBetween = (userA, userB) =>
  Friendship.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });

// GET /api/friends  - my friends
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate("requester", "name")
      .populate("recipient", "name")
      .sort({ updatedAt: -1 });

    // each friendship has two users; the friend is the one who is not me
    const friends = [];
    for (let i = 0; i < friendships.length; i++) {
      const f = friendships[i];
      if (!f.requester || !f.recipient) {
        continue; // the other account was deleted
      }
      let friend = f.requester;
      if (f.requester._id.toString() === req.user.id) {
        friend = f.recipient;
      }
      friends.push({ _id: friend._id, name: friend.name, since: f.updatedAt });
    }
    res.status(200).json(friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/friends/requests  - requests sent to me, and requests I sent
const getRequests = async (req, res) => {
  try {
    const incomingList = await Friendship.find({ recipient: req.user.id, status: "pending" })
      .populate("requester", "name")
      .sort({ createdAt: -1 });
    const outgoingList = await Friendship.find({ requester: req.user.id, status: "pending" })
      .populate("recipient", "name")
      .sort({ createdAt: -1 });

    const incoming = [];
    for (let i = 0; i < incomingList.length; i++) {
      if (incomingList[i].requester) {
        incoming.push({
          _id: incomingList[i]._id,
          user: incomingList[i].requester,
          createdAt: incomingList[i].createdAt,
        });
      }
    }

    const outgoing = [];
    for (let i = 0; i < outgoingList.length; i++) {
      if (outgoingList[i].recipient) {
        outgoing.push({
          _id: outgoingList[i]._id,
          user: outgoingList[i].recipient,
          createdAt: outgoingList[i].createdAt,
        });
      }
    }

    res.status(200).json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/friends/requests  body: { userId }  - send a friend request
const sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!isValidId(userId)) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You can not add yourself as a friend" });
    }

    const other = await User.findById(userId).select("name");
    if (!other) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = await findBetween(req.user.id, userId);
    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "You are already friends" });
      }
      if (existing.requester.toString() === req.user.id) {
        return res.status(400).json({ message: "Friend request already sent" });
      }
      // they already sent me a request, so sending one back means accepting theirs
      existing.status = "accepted";
      await existing.save();
      await notify(userId, "friend_accepted", req.user.id, "/users/" + req.user.id);
      return res.status(200).json({ message: "You are now friends", friendship: existing });
    }

    const friendship = await Friendship.create({ requester: req.user.id, recipient: userId });
    await notify(userId, "friend_request", req.user.id, "/friends");
    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (err) {
    // 11000 = duplicate key: the same request was sent twice at the same moment
    if (err.code === 11000) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    res.status(500).json({ message: err.message });
  }
};

// finds a pending request by its id; sends an error and returns null if it can't be used
const findPendingRequest = async (req, res) => {
  if (!isValidId(req.params.id)) {
    res.status(400).json({ message: "Invalid request ID" });
    return null;
  }
  const request = await Friendship.findById(req.params.id);
  if (!request || request.status !== "pending") {
    res.status(404).json({ message: "Friend request not found" });
    return null;
  }
  return request;
};

// POST /api/friends/requests/:id/accept  - accept a request sent to me
const acceptRequest = async (req, res) => {
  try {
    const request = await findPendingRequest(req, res);
    if (!request) {
      return;
    }
    if (request.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the person who got the request can accept it" });
    }

    request.status = "accepted";
    await request.save();
    await notify(request.requester, "friend_accepted", req.user.id, "/users/" + req.user.id);
    res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/friends/requests/:id/decline  - decline a request sent to me
const declineRequest = async (req, res) => {
  try {
    const request = await findPendingRequest(req, res);
    if (!request) {
      return;
    }
    if (request.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the person who got the request can decline it" });
    }

    await Friendship.findByIdAndDelete(request._id);
    res.status(200).json({ message: "Friend request declined" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/friends/requests/:id  - cancel a request I sent
const cancelRequest = async (req, res) => {
  try {
    const request = await findPendingRequest(req, res);
    if (!request) {
      return;
    }
    if (request.requester.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only cancel requests you sent" });
    }

    await Friendship.findByIdAndDelete(request._id);
    res.status(200).json({ message: "Friend request cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/friends/:userId  - remove a friend
const removeFriend = async (req, res) => {
  try {
    if (!isValidId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const friendship = await findBetween(req.user.id, req.params.userId);
    if (!friendship || friendship.status !== "accepted") {
      return res.status(404).json({ message: "This user is not your friend" });
    }

    await Friendship.findByIdAndDelete(friendship._id);
    res.status(200).json({ message: "Friend removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/friends/status/:userId  - how I am connected to one user.
// status is "self", "none", "friends", "sent" (I sent a request) or "received" (they sent one)
const getStatus = async (req, res) => {
  try {
    if (!isValidId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (req.params.userId === req.user.id) {
      return res.status(200).json({ status: "self" });
    }

    const friendship = await findBetween(req.user.id, req.params.userId);
    if (!friendship) {
      return res.status(200).json({ status: "none" });
    }
    if (friendship.status === "accepted") {
      return res.status(200).json({ status: "friends", requestId: friendship._id });
    }
    if (friendship.requester.toString() === req.user.id) {
      return res.status(200).json({ status: "sent", requestId: friendship._id });
    }
    res.status(200).json({ status: "received", requestId: friendship._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getFriends,
  getRequests,
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  removeFriend,
  getStatus,
};
