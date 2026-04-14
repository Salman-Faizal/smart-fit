const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Product = require("../models/Product");
const { destroyCloudinaryAsset } = require("../utils/cloudinaryAsset");

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  phone: user.phone || null,
  dateOfBirth: user.dateOfBirth || null,
  gender: user.gender || null,
});

// ─── GET /users/profile ───────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email role avatar phone dateOfBirth gender recentlyViewed viewedProducts purchasedProducts",
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user: sanitizeUser(user) });
};

// ─── PUT /users/me/profile ────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || undefined;
    if (gender !== undefined) user.gender = gender;

    await user.save();
    return res.json({ message: "Profile updated", user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// ─── POST /users/me/avatar ────────────────────────────────────────────────────

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Avatar image file is required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const oldPublicId = user.avatar?.publicId;
    user.avatar = {
      url: req.file.path || req.file.secure_url,
      publicId: req.file.filename || req.file.public_id,
    };
    await user.save();
    await destroyCloudinaryAsset(oldPublicId);

    return res.status(200).json({ message: "Avatar updated successfully", user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
};

// ─── POST /users/me/wishlist/:productId ───────────────────────────────────────

exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    const idx = user.wishlist.findIndex((e) => e.product.toString() === productId);
    let action;
    if (idx !== -1) {
      user.wishlist.splice(idx, 1);
      action = "removed";
    } else {
      user.wishlist.push({ product: productId, addedAt: new Date() });
      action = "added";
    }
    await user.save();

    return res.status(200).json({ action, wishlisted: action === "added", wishlist: user.wishlist });
  } catch {
    return res.status(500).json({ message: "Failed to update wishlist" });
  }
};

// ─── GET /users/me/wishlist ───────────────────────────────────────────────────

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("wishlist")
      .populate({
        path: "wishlist.product",
        select: "name price images category stock trendingScore createdAt",
      });
    if (!user) return res.status(404).json({ message: "User not found" });

    const wishlist = user.wishlist.map((w) => ({
      product: w.product,
      addedAt: w.addedAt,
    }));
    const products = wishlist.map((w) => w.product).filter(Boolean);

    return res.json({ wishlist, products });
  } catch {
    return res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

// ─── GET /users/me/recently-viewed ───────────────────────────────────────────

exports.getRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("recentlyViewed")
      .populate({ path: "recentlyViewed", select: "name price images category views purchases" });

    return res.status(200).json({ recentlyViewed: user?.recentlyViewed || [] });
  } catch {
    return res.status(500).json({ message: "Failed to fetch recently viewed" });
  }
};

// ─── GET /users/me/addresses ──────────────────────────────────────────────────

exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ addresses: user.addresses || [] });
  } catch {
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

// ─── POST /users/me/addresses ─────────────────────────────────────────────────

exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    const { label, fullName, line1, line2, city, province, postalCode, phone, isDefault } = req.body;

    // If this is the first address or isDefault requested, clear other defaults
    if (isDefault || !user.addresses.length) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }

    user.addresses.push({ label, fullName, line1, line2, city, province, postalCode, phone, isDefault: isDefault || !user.addresses.length });
    await user.save();

    return res.status(201).json({ message: "Address added", addresses: user.addresses });
  } catch {
    return res.status(500).json({ message: "Failed to add address" });
  }
};

// ─── PUT /users/me/addresses/:addressId ──────────────────────────────────────

exports.updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ message: "Address not found" });

    const { label, fullName, line1, line2, city, province, postalCode, phone, isDefault } = req.body;
    if (label !== undefined) addr.label = label;
    if (fullName !== undefined) addr.fullName = fullName;
    if (line1 !== undefined) addr.line1 = line1;
    if (line2 !== undefined) addr.line2 = line2;
    if (city !== undefined) addr.city = city;
    if (province !== undefined) addr.province = province;
    if (postalCode !== undefined) addr.postalCode = postalCode;
    if (phone !== undefined) addr.phone = phone;
    if (isDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
      addr.isDefault = true;
    }

    await user.save();
    return res.json({ message: "Address updated", addresses: user.addresses });
  } catch {
    return res.status(500).json({ message: "Failed to update address" });
  }
};

// ─── DELETE /users/me/addresses/:addressId ────────────────────────────────────

exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ message: "Address not found" });

    addr.deleteOne();
    await user.save();
    return res.json({ message: "Address deleted", addresses: user.addresses });
  } catch {
    return res.status(500).json({ message: "Failed to delete address" });
  }
};

// ─── PUT /users/me/addresses/:addressId/default ──────────────────────────────

exports.setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.forEach((a) => {
      a.isDefault = a._id.toString() === req.params.addressId;
    });
    await user.save();
    return res.json({ message: "Default address updated", addresses: user.addresses });
  } catch {
    return res.status(500).json({ message: "Failed to set default address" });
  }
};

// ─── POST /users/me/change-password ──────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword; // pre-save hook hashes it
    await user.save();
    return res.json({ message: "Password changed successfully" });
  } catch {
    return res.status(500).json({ message: "Failed to change password" });
  }
};

// ─── DELETE /users/me/account ─────────────────────────────────────────────────

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete avatar from cloud storage if present
    if (user.avatar?.publicId) {
      await destroyCloudinaryAsset(user.avatar.publicId).catch(() => {});
    }

    await User.findByIdAndDelete(req.user.id);
    return res.json({ message: "Account deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Failed to delete account" });
  }
};
