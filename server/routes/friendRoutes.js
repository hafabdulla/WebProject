const express = require("express");
const {
  getFriends,
  getRequests,
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  removeFriend,
  getStatus,
} = require("../controllers/friendController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// every friends route needs a logged in user
router.use(protect);

// the fixed paths (/requests, /status) must come before "/:userId"
router.get("/", getFriends);
router.get("/requests", getRequests);
router.post("/requests", sendRequest);
router.post("/requests/:id/accept", acceptRequest);
router.post("/requests/:id/decline", declineRequest);
router.delete("/requests/:id", cancelRequest);
router.get("/status/:userId", getStatus);
router.delete("/:userId", removeFriend);

module.exports = router;
