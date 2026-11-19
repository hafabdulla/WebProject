const express = require("express");
const {
  getConversations,
  getMessages,
  sendMessage,
  markRead,
  getUnreadCount,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// the fixed paths must come before "/:userId/..."
router.get("/conversations", getConversations);
router.get("/unread", getUnreadCount);
router.get("/:userId/messages", getMessages);
router.post("/:userId/messages", sendMessage);
router.post("/:userId/read", markRead);

module.exports = router;
