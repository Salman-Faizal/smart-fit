const recommendationService = require("../services/recommendation.service");

exports.getProductRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getProductRecommendations({
        productId: req.params.productId,
        userId: req.user?.id,
        limit: 12,
      });

    return res.status(200).json({ recommendations });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Server error" });
  }
};

exports.getTrendingRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getTrendingRecommendations({
        category: req.query.category,
        limit: 12,
      });
    console.log("TRENDING COUNT:", recommendations.length);

    return res.status(200).json({ recommendations });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load trending products" });
  }
};

exports.getHybridAlsoViewedRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getHybridAlsoViewedRecommendations({
        productId: req.params.productId,
        userId: req.user?.id,
        limit: 12,
      });

    return res.status(200).json({ recommendations });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Server error" });
  }
};
