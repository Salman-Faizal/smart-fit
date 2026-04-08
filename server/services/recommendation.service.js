const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");

const RECOMMENDATION_SELECT =
  "name price images category views purchases stock";

const buildScore = ({
  candidate,
  anchorCategory,
  recentViewedSet,
  recentCategories,
}) => {
  let score = 0;

  if (candidate.category === anchorCategory) {
    score += 60;
  }

  score += Number(candidate.purchases || 0) * 5;
  score += Number(candidate.views || 0) * 2;

  if (recentViewedSet.has(String(candidate._id))) {
    score += 10;
  }

  if (recentCategories.has(candidate.category)) {
    score += 6;
  }

  return score;
};

const getRecentContext = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      recentViewedSet: new Set(),
      recentCategories: new Set(),
    };
  }

  const user = await User.findById(userId).select("recentlyViewed");
  const recentlyViewed = (user?.recentlyViewed || []).map(String);

  if (!recentlyViewed.length) {
    return {
      recentViewedSet: new Set(),
      recentCategories: new Set(),
    };
  }

  const recentlyViewedProducts = await Product.find({
    _id: { $in: recentlyViewed },
  }).select("category");

  return {
    recentViewedSet: new Set(recentlyViewed),
    recentCategories: new Set(
      recentlyViewedProducts.map((product) => product.category).filter(Boolean),
    ),
  };
};

const getTrendingRecommendations = async ({
  category,
  limit = 5,
  excludeProductId,
} = {}) => {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (excludeProductId && mongoose.Types.ObjectId.isValid(excludeProductId)) {
    query._id = { $ne: excludeProductId };
  }

  return Product.find(query)
    .sort({ purchases: -1, views: -1, createdAt: -1 })
    .limit(limit)
    .select(RECOMMENDATION_SELECT);
};

const getProductRecommendations = async ({ productId, userId, limit = 5 }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("Invalid product id");
    error.statusCode = 400;
    throw error;
  }

  const targetProduct =
    await Product.findById(productId).select("_id category");

  if (!targetProduct) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const { recentViewedSet, recentCategories } = await getRecentContext(userId);

  const candidates = await Product.find({
    _id: { $ne: targetProduct._id },
  })
    .select(RECOMMENDATION_SELECT)
    .limit(200);

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: buildScore({
        candidate,
        anchorCategory: targetProduct.category,
        recentViewedSet,
        recentCategories,
      }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.candidate.purchases !== a.candidate.purchases) {
        return b.candidate.purchases - a.candidate.purchases;
      }
      if (b.candidate.views !== a.candidate.views) {
        return b.candidate.views - a.candidate.views;
      }
      return new Date(b.candidate.createdAt) - new Date(a.candidate.createdAt);
    });

  const deduped = [];
  const seen = new Set();

  for (const item of ranked) {
    const id = String(item.candidate._id);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(item.candidate);
    if (deduped.length >= limit) break;
  }

  if (!deduped.length) {
    return getTrendingRecommendations({
      category: targetProduct.category,
      limit,
      excludeProductId: productId,
    });
  }

  return deduped;
};

module.exports = {
  RECOMMENDATION_SELECT,
  getProductRecommendations,
  getTrendingRecommendations,
};
