const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { runUpload, uploadAvatar } = require("../middleware/upload.middleware");
const {
  getProfile,
  uploadAvatar: uploadAvatarController,
  getRecentlyViewed,
} = require("../controllers/user.controller");

router.get("/profile", protect, getProfile);
router.post(
  "/me/avatar",
  protect,
  runUpload(uploadAvatar),
  uploadAvatarController,
);
router.get("/me/recently-viewed", protect, getRecentlyViewed);

module.exports = router;
