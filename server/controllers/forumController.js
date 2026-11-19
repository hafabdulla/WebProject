const mongoose = require("mongoose");
const Thread = require("../models/Thread");
const Reply = require("../models/Reply");
const Report = require("../models/Report");

// The forum boards. The key is used in URLs, the label is shown on the page.
const BOARDS = [
  { key: "general", label: "General", description: "Talk about anything movie related" },
  { key: "recommendations", label: "Recommendations", description: "Ask for and share movie suggestions" },
  { key: "reviews", label: "Reviews and opinions", description: "Discuss what you watched and what you thought" },
  { key: "news", label: "News and upcoming", description: "Trailers, release dates and movie news" },
  { key: "offtopic", label: "Off topic", description: "Anything that is not about movies" },
];

const PAGE_SIZE = 20;

const isValidId = (id) => mongoose.isObjectIdOrHexString(id);

const findBoard = (key) => {
  for (let i = 0; i < BOARDS.length; i++) {
    if (BOARDS[i].key === key) {
      return BOARDS[i];
    }
  }
  return null;
};

// checks a piece of text from the user. Returns an error message, or "" if it is fine
const checkText = (value, name, min, max) => {
  if (typeof value !== "string" || value.trim().length < min) {
    if (min === 1) {
      return name + " can not be empty";
    }
    return name + " must be at least " + min + " characters";
  }
  if (value.trim().length > max) {
    return name + " can be at most " + max + " characters";
  }
  return "";
};

// true if the logged in user wrote this post, or is an admin
const canChange = (post, user) => post.author.toString() === user.id || user.role === "admin";

// GET /api/forum/boards  - every board with its number of threads
const getBoards = async (req, res) => {
  try {
    const counts = await Thread.aggregate([{ $group: { _id: "$board", count: { $sum: 1 } } }]);

    const boards = [];
    for (let i = 0; i < BOARDS.length; i++) {
      let threadCount = 0;
      for (let j = 0; j < counts.length; j++) {
        if (counts[j]._id === BOARDS[i].key) {
          threadCount = counts[j].count;
        }
      }
      boards.push({ ...BOARDS[i], threadCount });
    }
    res.status(200).json(boards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/forum/boards/:board/threads?page=1  - threads of one board, most active first
const getBoardThreads = async (req, res) => {
  try {
    const board = findBoard(req.params.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const total = await Thread.countDocuments({ board: board.key });
    const threads = await Thread.find({ board: board.key })
      .populate("author", "name")
      .sort({ lastActivityAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    res.status(200).json({
      board,
      page,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      threads,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/forum/threads  body: { board, title, body }  - start a thread
const createThread = async (req, res) => {
  try {
    const { board, title, body } = req.body;
    if (!findBoard(board)) {
      return res.status(400).json({ message: "Pick a valid board" });
    }
    const error = checkText(title, "Title", 3, 150) || checkText(body, "Post", 1, 5000);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const thread = await Thread.create({
      board,
      title: title.trim(),
      body: body.trim(),
      author: req.user.id,
    });
    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/forum/threads/:id  - one thread with all its replies
const getThread = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }

    const thread = await Thread.findById(req.params.id).populate("author", "name");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    const replies = await Reply.find({ thread: thread._id })
      .populate("author", "name")
      .sort({ createdAt: 1 });

    res.status(200).json({ thread, board: findBoard(thread.board), replies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/forum/threads/:id  body: { title, body }  - edit your own thread
const updateThread = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }
    const thread = await Thread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    if (thread.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own thread" });
    }

    const { title, body } = req.body;
    if (title !== undefined) {
      const error = checkText(title, "Title", 3, 150);
      if (error) {
        return res.status(400).json({ message: error });
      }
      thread.title = title.trim();
    }
    if (body !== undefined) {
      const error = checkText(body, "Post", 1, 5000);
      if (error) {
        return res.status(400).json({ message: error });
      }
      thread.body = body.trim();
    }

    await thread.save();
    res.status(200).json(thread);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/forum/threads/:id  - delete your own thread (an admin can delete any).
// Its replies and any reports about it are deleted too.
const deleteThread = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }
    const thread = await Thread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    if (!canChange(thread, req.user)) {
      return res.status(403).json({ message: "You can only delete your own thread" });
    }

    const replies = await Reply.find({ thread: thread._id }).select("_id");
    const replyIds = [];
    for (let i = 0; i < replies.length; i++) {
      replyIds.push(replies[i]._id);
    }

    await Report.deleteMany({
      $or: [
        { targetType: "thread", targetId: thread._id },
        { targetType: "reply", targetId: { $in: replyIds } },
      ],
    });
    await Reply.deleteMany({ thread: thread._id });
    await Thread.findByIdAndDelete(thread._id);
    res.status(200).json({ message: "Thread deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/forum/threads/:id/replies  body: { body }  - reply to a thread
const createReply = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }
    const error = checkText(req.body.body, "Reply", 1, 3000);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const thread = await Thread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const reply = await Reply.create({
      thread: thread._id,
      author: req.user.id,
      body: req.body.body.trim(),
    });

    // timestamps: false keeps the thread's updatedAt the same, so the
    // thread is not shown as "edited" just because someone replied
    await Thread.updateOne(
      { _id: thread._id },
      { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } },
      { timestamps: false }
    );

    await reply.populate("author", "name");
    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/forum/replies/:id  body: { body }  - edit your own reply
const updateReply = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid reply ID" });
    }
    const reply = await Reply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }
    if (reply.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own reply" });
    }
    const error = checkText(req.body.body, "Reply", 1, 3000);
    if (error) {
      return res.status(400).json({ message: error });
    }

    reply.body = req.body.body.trim();
    await reply.save();
    res.status(200).json(reply);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/forum/replies/:id  - delete your own reply (an admin can delete any)
const deleteReply = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid reply ID" });
    }
    const reply = await Reply.findById(req.params.id);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }
    if (!canChange(reply, req.user)) {
      return res.status(403).json({ message: "You can only delete your own reply" });
    }

    await Report.deleteMany({ targetType: "reply", targetId: reply._id });
    await Reply.findByIdAndDelete(reply._id);
    await Thread.updateOne(
      { _id: reply.thread, replyCount: { $gt: 0 } },
      { $inc: { replyCount: -1 } },
      { timestamps: false }
    );
    res.status(200).json({ message: "Reply deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/forum/reports  body: { targetType, targetId, reason }  - report a thread or reply
const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (targetType !== "thread" && targetType !== "reply") {
      return res.status(400).json({ message: "You can report a thread or a reply" });
    }
    if (!isValidId(targetId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const error = checkText(reason, "Reason", 3, 500);
    if (error) {
      return res.status(400).json({ message: error });
    }

    let post;
    if (targetType === "thread") {
      post = await Thread.findById(targetId);
    } else {
      post = await Reply.findById(targetId);
    }
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.author.toString() === req.user.id) {
      return res.status(400).json({ message: "You can not report your own post" });
    }

    await Report.create({ targetType, targetId, reporter: req.user.id, reason: reason.trim() });
    res.status(201).json({ message: "Thanks, an admin will look at this post" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "You already reported this post" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/forum/reports?status=open  - reports for admins, with a preview of each post
const getReports = async (req, res) => {
  try {
    const status = req.query.status || "open";
    if (status !== "open" && status !== "resolved") {
      return res.status(400).json({ message: "Status must be open or resolved" });
    }

    const reports = await Report.find({ status })
      .populate("reporter", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    const results = [];
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      let post = null;
      if (report.targetType === "thread") {
        const thread = await Thread.findById(report.targetId).populate("author", "name");
        if (thread) {
          post = { threadId: thread._id, title: thread.title, body: thread.body, author: thread.author };
        }
      } else {
        const reply = await Reply.findById(report.targetId).populate("author", "name");
        if (reply) {
          post = { threadId: reply.thread, body: reply.body, author: reply.author };
        }
      }
      results.push({ ...report.toObject(), post });
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/forum/reports/:id  body: { status }  - an admin marks a report open or resolved
const updateReport = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }
    const { status } = req.body;
    if (status !== "open" && status !== "resolved") {
      return res.status(400).json({ message: "Status must be open or resolved" });
    }

    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getBoards,
  getBoardThreads,
  createThread,
  getThread,
  updateThread,
  deleteThread,
  createReply,
  updateReply,
  deleteReply,
  createReport,
  getReports,
  updateReport,
};
