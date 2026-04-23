const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const jwt = require("jsonwebtoken");
const { sendEmail, verificationEmail, welcomeEmail } = require("../services/email.service");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const buildAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const issueToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing Fields" });
    }

    const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w{2,}$/;
    const passwrdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid Email" });
    }

    if (!passwrdRegex.test(password)) {
      return res.status(400).json({ message: "Invalid Password" });
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    await PendingRegistration.findOneAndUpdate(
      { email },
      { name, hashedPassword, otpCode: otp, otpExpiry },
      { upsert: true, new: true },
    );

    sendEmail(email, "Verify your Smart Fit account", verificationEmail(name, otp)).catch(() => {});

    res.status(200).json({ message: "Check your inbox for the 6-digit verification code." });
  } catch (err) {
    res.status(500).json({ message: "Failed to send verification code." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Missing Fields" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: "Login Successful!",
      token: issueToken(user),
      user: buildAuthUser(user),
    });
  } catch (_err) {
    res.status(500).json({ message: "Login Failed" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const pending = await PendingRegistration.findOne({ email });

    if (!pending) {
      return res.status(400).json({ message: "No pending registration for this email." });
    }

    if (!pending.otpExpiry || pending.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    if (pending.otpCode !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid code." });
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ message: "Email already registered." });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.hashedPassword,
      lastLogin: new Date(),
    });
    user.$locals.skipPasswordHash = true;
    await user.save();

    await PendingRegistration.deleteOne({ email });

    sendEmail(email, `Welcome to Smart Fit, ${user.name}! 👋`, welcomeEmail(user.name)).catch(() => {});

    res.status(200).json({
      message: "Email verified successfully.",
      token: issueToken(user),
      user: buildAuthUser(user),
    });
  } catch (_err) {
    res.status(500).json({ message: "Verification failed." });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const pending = await PendingRegistration.findOne({ email });

    if (!pending) {
      return res.status(400).json({ message: "No pending registration for this email." });
    }

    // Rate-limit: block if last OTP was issued less than 60s ago
    if (pending.otpExpiry && (pending.otpExpiry.getTime() - Date.now()) > (OTP_EXPIRY_MS - RESEND_COOLDOWN_MS)) {
      return res.status(429).json({ message: "Please wait before requesting a new code." });
    }

    const otp = generateOtp();
    pending.otpCode = otp;
    pending.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    await pending.save();

    sendEmail(email, "Verify your Smart Fit account", verificationEmail(pending.name, otp)).catch(() => {});

    res.status(200).json({ message: "A new code has been sent." });
  } catch (_err) {
    res.status(500).json({ message: "Failed to resend code." });
  }
};
