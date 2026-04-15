const recommendationService = require("../services/recommendation.service");
const forYouService = require("../services/forYou.service");
const discoverService = require("../services/discover.service");
const alsoViewedService = require("../services/alsoViewed.service");
const checkoutUpsellService = require("../services/checkoutUpsell.service");
const quizRecommendationService = require("../services/quizRecommendation.service");

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

exports.getDiscoverFeed = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    const { cursor = null, limit, exclude } = req.query;
    const excludeIds = parseExcludeIds(exclude);

    const result = await discoverService.getDiscoverFeed({
      userId,
      cursor: cursor || null,
      limit: Number(limit) || 12,
      excludeIds,
    });

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load discover feed" });
  }
};

exports.getTopPicksForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const excludeIds = parseExcludeIds(req.query.exclude);
    const result = await forYouService.getTopPicksForUser({ userId, excludeIds });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Failed to load top picks" });
  }
};

exports.getTrendingWithRanks = async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 20);
    const products =
      await recommendationService.getTrendingProductsWithRanks({ limit });
    return res.status(200).json({ products, total: products.length });
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to load trending products" });
  }
};

exports.getCheckoutUpsell = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartProductIds = req.query.cartProductIds
      ? String(req.query.cartProductIds).split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const result = await checkoutUpsellService.getCheckoutUpsell({
      userId,
      cartProductIds,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Failed to load upsell recommendations" });
  }
};

exports.getAlsoViewed = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id ?? null;
    const excludeIds = parseExcludeIds(req.query.exclude);

    const result = await alsoViewedService.getAlsoViewed({
      productId,
      userId,
      excludeIds,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Failed to load also-viewed products" });
  }
};

exports.getQuizRecommendations = async (req, res) => {
  try {
    const { occasion, fit, colorMood, budget, style, categories } = req.body;
    const result = await quizRecommendationService.getQuizRecommendations({
      userId: req.user.id,
      occasion,
      fit,
      colorMood,
      budget,
      style,
      categories: Array.isArray(categories) ? categories : [],
    });
    return res.status(200).json(result);
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to get quiz recommendations" });
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
