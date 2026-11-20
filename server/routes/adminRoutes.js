const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { getUsers, updateUserRole, setBlocked , getStats} = require("../controllers/adminController");

router.get("/users", protect, adminOnly, getUsers);
router.put("/users/:id/role", protect, adminOnly, updateUserRole);
router.put("/users/:id/block", protect, adminOnly, setBlocked);
router.get("/stats", protect, adminOnly, getStats)
module.exports = router;