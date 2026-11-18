const express = require("express");
const { searchUsers, getPublicUser } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// /search must come before "/:id", otherwise "search" would be read as a user id
router.get("/search", protect, searchUsers);
router.get("/:id", getPublicUser);

module.exports = router;
