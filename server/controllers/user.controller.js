const User = require("../models/User");

exports.getProfile = (req, res) => {
  res.json({
    user: req.user,
  });
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
