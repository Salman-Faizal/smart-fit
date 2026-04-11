const recommendationService = require("../services/recommendation.service");

const resolveLimit = (limit, fallback) =>
  recommendationService.normalizeLimit(limit, fallback);

const parseExcludeIds = (exclude) => {
  if (!exclude) return [];

  return String(exclude)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

exports.getProductRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getProductRecommendations({
        productId: req.params.productId,
        userId: req.user?.id,
        limit: resolveLimit(req.query.limit, 18),
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
        limit: resolveLimit(req.query.limit, 18),
        excludeIds: parseExcludeIds(req.query.exclude),
      });

    return res.status(200).json({ recommendations });
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to load trending products" });
  }
};

exports.getForYouRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getForYouRecommendations({
        userId: req.user?.id,
        limit: resolveLimit(req.query.limit, 18),
        excludeIds: parseExcludeIds(req.query.exclude),
      });

    return res.status(200).json({ recommendations });
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to load personalized recommendations" });
  }
};

exports.getDiscoverRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getDiscoverRecommendations({
        userId: req.user?.id,
        limit: resolveLimit(req.query.limit, 18),
        excludeIds: parseExcludeIds(req.query.exclude),
      });

    return res.status(200).json({ recommendations });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load discover feed" });
  }
};

exports.getHybridAlsoViewedRecommendations = async (req, res) => {
  try {
    const recommendations =
      await recommendationService.getHybridAlsoViewedRecommendations({
        productId: req.params.productId,
        userId: req.user?.id,
        limit: resolveLimit(req.query.limit, 18),
      });

    return res.status(200).json({ recommendations });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Server error" });
  }
};
