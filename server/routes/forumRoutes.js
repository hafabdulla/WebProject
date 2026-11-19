const express = require("express");
const {
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
} = require("../controllers/forumController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// reading the forum is public; writing needs a logged in user
router.get("/boards", getBoards);
router.get("/boards/:board/threads", getBoardThreads);
router.post("/threads", protect, createThread);
router.get("/threads/:id", getThread);
router.put("/threads/:id", protect, updateThread);
router.delete("/threads/:id", protect, deleteThread);
router.post("/threads/:id/replies", protect, createReply);
router.put("/replies/:id", protect, updateReply);
router.delete("/replies/:id", protect, deleteReply);

// reports: anyone logged in can report, only admins can see and resolve them
router.post("/reports", protect, createReport);
router.get("/reports", protect, adminOnly, getReports);
router.put("/reports/:id", protect, adminOnly, updateReport);

module.exports = router;
