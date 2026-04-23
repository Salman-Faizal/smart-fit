const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    otpCode: { type: String, required: true },
    otpExpiry: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB TTL: auto-remove documents once otpExpiry is reached
pendingRegistrationSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);
