const User = require("../models/User");
const jwt = require("jsonwebtoken");

const buildAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
});

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

    await User.create({ name, email, password });

    res.status(201).json({
      message: "User Registered Successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already Exists" });
    }

    res.status(500).json({ message: "Failed to create user" });
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

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login Successful!",
      token,
      user: buildAuthUser(user),
    });
  } catch (_err) {
    res.status(500).json({ message: "Login Failed" });
  }
};
