const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { runUpload, uploadAvatar } = require("../middleware/upload.middleware");
const {
  getProfile,
  updateProfile,
  uploadAvatar: uploadAvatarController,
  getRecentlyViewed,
  toggleWishlist,
  getWishlist,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  changePassword,
  deleteAccount,
} = require("../controllers/user.controller");

// Profile
router.get("/profile", protect, getProfile);
router.put("/me/profile", protect, updateProfile);

// Avatar
router.post("/me/avatar", protect, runUpload(uploadAvatar), uploadAvatarController);

// Recently viewed
router.get("/me/recently-viewed", protect, getRecentlyViewed);

// Wishlist
router.post("/me/wishlist/:productId", protect, toggleWishlist);
router.get("/me/wishlist", protect, getWishlist);

// Addresses
router.get("/me/addresses", protect, getAddresses);
router.post("/me/addresses", protect, addAddress);
router.put("/me/addresses/:addressId", protect, updateAddress);
router.delete("/me/addresses/:addressId", protect, deleteAddress);
router.put("/me/addresses/:addressId/default", protect, setDefaultAddress);

// Security
router.post("/me/change-password", protect, changePassword);
router.delete("/me/account", protect, deleteAccount);

module.exports = router;
