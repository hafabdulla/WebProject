const express = require("express");
const {
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
} = require("../controllers/listController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// lists are private: every route needs a logged in user
router.use(protect);

router.get("/", getMyLists);
router.post("/", createList);
router.get("/:id", getList);
router.put("/:id", updateList);
router.delete("/:id", deleteList);
router.post("/:id/items", addItem);
router.delete("/:id/items/:movieId", removeItem);
router.post("/:id/members", inviteMember);
router.post("/:id/accept", acceptInvite);
router.post("/:id/decline", declineInvite);
router.delete("/:id/members/:userId", removeMember);

module.exports = router;
