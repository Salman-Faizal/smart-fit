const User = require("../models/User");
const { destroyCloudinaryAsset } = require("../utils/cloudinaryAsset");

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
});

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email role avatar recentlyViewed viewedProducts purchasedProducts",
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: sanitizeUser(user) });
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Avatar image file is required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldAvatarPublicId = user.avatar?.publicId;

    user.avatar = {
      url: req.file.path || req.file.secure_url,
      publicId: req.file.filename || req.file.public_id,
    };

    await user.save();

    await destroyCloudinaryAsset(oldAvatarPublicId);

    return res.status(200).json({
      message: "Avatar updated successfully",
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id).select("wishlist");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingIndex = user.wishlist.findIndex(
      (entry) => entry.product.toString() === productId,
    );

    let action;
    if (existingIndex !== -1) {
      user.wishlist.splice(existingIndex, 1);
      action = "removed";
    } else {
      user.wishlist.push({ product: productId, addedAt: new Date() });
      action = "added";
    }

    await user.save();

    return res.status(200).json({
      action,
      wishlisted: action === "added",
      wishlist: user.wishlist,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update wishlist" });
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("recentlyViewed")
      .populate({
        path: "recentlyViewed",
        select: "name price images category views purchases",
      });

    return res.status(200).json({
      recentlyViewed: user?.recentlyViewed || [],
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch recently viewed" });
  }
};
