const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const AdminSettings = mongoose.model("AdminSettings", adminSettingsSchema);

module.exports = AdminSettings;
