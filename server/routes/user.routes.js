const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  getProfile,
  getRecentlyViewed,
} = require("../controllers/user.controller");

router.get("/profile", protect, getProfile);
router.get("/me/recently-viewed", protect, getRecentlyViewed);

module.exports = router;
