const mongoose = require("mongoose");

// One report = one user saying a forum thread or reply is inappropriate.
// Admins see the open reports and mark them resolved.
const reportSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["thread", "reply"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true }
);

// a user can report the same post only once
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
