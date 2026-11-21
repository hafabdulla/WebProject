const mongoose = require("mongoose");
const List = require("../models/List");
const User = require("../models/User");
const { getMovieBasics } = require("../utils/tmdb");
const { areFriends } = require("../utils/friends");
const { emitToUser } = require("../socket");
const notify = require("../utils/notify");

const MAX_LISTS = 100;
const MAX_ITEMS = 500;
const MAX_MEMBERS = 10;

const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

// how a user is connected to a list: "owner", "member", "invited" or null
const roleIn = (list, userId) => {
  const ownerId = list.owner._id ? list.owner._id.toString() : list.owner.toString();
  if (ownerId === userId) {
    return "owner";
  }
  for (let i = 0; i < list.members.length; i++) {
    const member = list.members[i];
    const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
    if (memberId === userId) {
      return member.status === "accepted" ? "member" : "invited";
    }
  }
  return null;
};

// tells the owner and every accepted member that the list changed,
// so a list page that is open in their browser reloads itself
const announceChange = (list) => {
  emitToUser(list.owner._id || list.owner, "list_updated", { listId: list._id });
  for (let i = 0; i < list.members.length; i++) {
    if (list.members[i].status === "accepted") {
      emitToUser(list.members[i].user._id || list.members[i].user, "list_updated", {
        listId: list._id,
      });
    }
  }
};

// checks the name and description. Returns an error message, or "" if they are fine
const checkDetails = (name, description) => {
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 1) {
      return "The list needs a name";
    }
    if (name.trim().length > 80) {
      return "The name can be at most 80 characters";
    }
  }
  if (description !== undefined) {
    if (typeof description !== "string") {
      return "The description must be text";
    }
    if (description.trim().length > 500) {
      return "The description can be at most 500 characters";
    }
  }
  return "";
};

// finds the list in the URL. Sends an error and returns null if it does not exist
// or the user has no access to it.
const findList = async (req, res) => {
  if (!isValidId(req.params.id)) {
    res.status(400).json({ message: "Invalid list ID" });
    return null;
  }
  const list = await List.findById(req.params.id);
  if (!list || roleIn(list, req.user.id) === null) {
    // the same answer for "does not exist" and "not yours", so private lists stay private
    res.status(404).json({ message: "List not found" });
    return null;
  }
  return list;
};

// GET /api/lists  - my lists (owned and shared with me) and my pending invites
const getMyLists = async (req, res) => {
  try {
    const me = req.user.id;
    const lists = await List.find({
      $or: [{ owner: me }, { members: { $elemMatch: { user: me, status: "accepted" } } }],
    })
      .populate("owner", "name")
      .sort({ updatedAt: -1 });

    const invites = await List.find({ members: { $elemMatch: { user: me, status: "invited" } } })
      .populate("owner", "name")
      .sort({ updatedAt: -1 });

    // a short summary of each list, with the first 4 posters for a preview
    const summary = (list) => {
      const posters = [];
      for (let i = 0; i < list.items.length && posters.length < 4; i++) {
        if (list.items[i].posterPath) {
          posters.push(list.items[i].posterPath);
        }
      }
      let memberCount = 0;
      for (let i = 0; i < list.members.length; i++) {
        if (list.members[i].status === "accepted") {
          memberCount++;
        }
      }
      return {
        _id: list._id,
        name: list.name,
        description: list.description,
        owner: list.owner,
        role: roleIn(list, me),
        itemCount: list.items.length,
        memberCount,
        posters,
        updatedAt: list.updatedAt,
      };
    };

    const listSummaries = [];
    for (let i = 0; i < lists.length; i++) {
      listSummaries.push(summary(lists[i]));
    }
    const inviteSummaries = [];
    for (let i = 0; i < invites.length; i++) {
      inviteSummaries.push(summary(invites[i]));
    }

    res.status(200).json({ lists: listSummaries, invites: inviteSummaries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/lists  body: { name, description }  - make a new list
const createList = async (req, res) => {
  try {
    const { name, description } = req.body;
    const error = checkDetails(name === undefined ? "" : name, description);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const count = await List.countDocuments({ owner: req.user.id });
    if (count >= MAX_LISTS) {
      return res.status(400).json({ message: "You can have at most " + MAX_LISTS + " lists" });
    }

    const list = await List.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      owner: req.user.id,
    });
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/lists/:id  - one list with its movies and members
const getList = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    await list.populate([
      { path: "owner", select: "name" },
      { path: "members.user", select: "name" },
      { path: "items.addedBy", select: "name" },
    ]);
    res.status(200).json({ list, role: roleIn(list, req.user.id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/lists/:id  body: { name, description }  - rename the list (owner or member)
const updateList = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    const role = roleIn(list, req.user.id);
    if (role !== "owner" && role !== "member") {
      return res.status(403).json({ message: "Accept the invite before editing this list" });
    }

    const { name, description } = req.body;
    const error = checkDetails(name, description);
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (name !== undefined) {
      list.name = name.trim();
    }
    if (description !== undefined) {
      list.description = description.trim();
    }
    await list.save();
    announceChange(list);
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/lists/:id  - delete the list (owner only)
const deleteList = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    if (roleIn(list, req.user.id) !== "owner") {
      return res.status(403).json({ message: "Only the owner can delete this list" });
    }
    await List.findByIdAndDelete(list._id);
    announceChange(list);
    res.status(200).json({ message: "List deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/lists/:id/items  body: { movieId }  - add a movie (owner or member)
const addItem = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    const role = roleIn(list, req.user.id);
    if (role !== "owner" && role !== "member") {
      return res.status(403).json({ message: "Accept the invite before editing this list" });
    }

    const movieId = Number(req.body.movieId);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      return res.status(400).json({ message: "A valid movieId is required" });
    }
    for (let i = 0; i < list.items.length; i++) {
      if (list.items[i].movieId === movieId) {
        return res.status(400).json({ message: "This movie is already in the list" });
      }
    }
    if (list.items.length >= MAX_ITEMS) {
      return res.status(400).json({ message: "A list can have at most " + MAX_ITEMS + " movies" });
    }

    const movie = await getMovieBasics(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    list.items.push({ ...movie, addedBy: req.user.id });
    await list.save();
    announceChange(list);
    res.status(201).json({ message: "Added to " + list.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/lists/:id/items/:movieId  - remove a movie (owner or member)
const removeItem = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    const role = roleIn(list, req.user.id);
    if (role !== "owner" && role !== "member") {
      return res.status(403).json({ message: "Accept the invite before editing this list" });
    }

    const movieId = Number(req.params.movieId);
    const kept = [];
    for (let i = 0; i < list.items.length; i++) {
      if (list.items[i].movieId !== movieId) {
        kept.push(list.items[i]);
      }
    }
    if (kept.length === list.items.length) {
      return res.status(404).json({ message: "This movie is not in the list" });
    }

    list.items = kept;
    await list.save();
    announceChange(list);
    res.status(200).json({ message: "Removed from " + list.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/lists/:id/members  body: { userId }  - invite a friend (owner only)
const inviteMember = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    if (roleIn(list, req.user.id) !== "owner") {
      return res.status(403).json({ message: "Only the owner can invite people" });
    }

    const { userId } = req.body;
    if (!isValidId(userId)) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You already own this list" });
    }
    if (roleIn(list, userId) !== null) {
      return res.status(400).json({ message: "This person is already invited or in the list" });
    }
    if (list.members.length >= MAX_MEMBERS) {
      return res.status(400).json({ message: "A list can be shared with at most " + MAX_MEMBERS + " people" });
    }
    const user = await User.findById(userId).select("name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!(await areFriends(req.user.id, userId))) {
      return res.status(403).json({ message: "You can only share lists with your friends" });
    }

    list.members.push({ user: userId, status: "invited" });
    await list.save();
    await notify(userId, "list_invite", req.user.id, "/lists/" + list._id);
    announceChange(list);
    res.status(201).json({ message: "Invite sent to " + user.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/lists/:id/accept  - accept an invite to a list
const acceptInvite = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    if (roleIn(list, req.user.id) !== "invited") {
      return res.status(400).json({ message: "You have no invite to this list" });
    }
    for (let i = 0; i < list.members.length; i++) {
      if (list.members[i].user.toString() === req.user.id) {
        list.members[i].status = "accepted";
      }
    }
    await list.save();
    await notify(list.owner, "list_joined", req.user.id, "/lists/" + list._id);
    announceChange(list);
    res.status(200).json({ message: "You joined " + list.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// removes one user from the members of a list and saves it
const removeMemberFromList = async (list, userId) => {
  const kept = [];
  for (let i = 0; i < list.members.length; i++) {
    if (list.members[i].user.toString() !== userId) {
      kept.push(list.members[i]);
    }
  }
  list.members = kept;
  await list.save();
};

// POST /api/lists/:id/decline  - decline an invite to a list
const declineInvite = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    if (roleIn(list, req.user.id) !== "invited") {
      return res.status(400).json({ message: "You have no invite to this list" });
    }
    await removeMemberFromList(list, req.user.id);
    announceChange(list);
    res.status(200).json({ message: "Invite declined" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/lists/:id/members/:userId  - the owner removes someone,
// or a member leaves (when :userId is their own id)
const removeMember = async (req, res) => {
  try {
    const list = await findList(req, res);
    if (!list) {
      return;
    }
    const target = req.params.userId;
    const myRole = roleIn(list, req.user.id);
    const leaving = target === req.user.id;

    if (leaving && myRole === "owner") {
      return res.status(400).json({ message: "The owner can not leave; delete the list instead" });
    }
    if (!leaving && myRole !== "owner") {
      return res.status(403).json({ message: "Only the owner can remove people" });
    }
    if (!isValidId(target) || roleIn(list, target) === null || roleIn(list, target) === "owner") {
      return res.status(404).json({ message: "This person is not in the list" });
    }

    // tell everybody first, so the removed person's open page also reloads
    announceChange(list);
    await removeMemberFromList(list, target);
    res.status(200).json({ message: leaving ? "You left the list" : "Removed from the list" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyLists,
  createList,
  getList,
  updateList,
  deleteList,
  addItem,
  removeItem,
  inviteMember,
  acceptInvite,
  declineInvite,
  removeMember,
};
