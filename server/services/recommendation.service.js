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

const getAlsoViewedRecommendations = async (productId, limit = 5) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("Invalid product id");
    error.statusCode = 400;
    throw error;
  }

  const users = await User.find({
    role: "customer",
    viewedProducts: productId,
  }).select("viewedProducts");

  if (!users.length) {
    return [];
  }

  const counts = new Map();

  for (const user of users) {
    for (const viewedId of user.viewedProducts || []) {
      const candidateId = String(viewedId);
      if (candidateId === String(productId)) continue;
      counts.set(candidateId, (counts.get(candidateId) || 0) + 1);
    }
  }

  const rankedIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(limit * 3, limit))
    .map(([id]) => id);

  if (!rankedIds.length) {
    return [];
  }

  const products = await Product.find({
    _id: { $in: rankedIds },
  }).select(RECOMMENDATION_SELECT);

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const results = [];
  for (const id of rankedIds) {
    const product = productMap.get(id);
    if (!product) continue;
    results.push(product);
    if (results.length >= limit) break;
  }

  return results;
};

const getHybridAlsoViewedRecommendations = async ({
  userId,
  productId,
  limit = 5,
}) => {
  const [alsoViewed, phase1] = await Promise.all([
    getAlsoViewedRecommendations(productId, limit),
    getProductRecommendations({ productId, userId, limit }),
  ]);

  const merged = [];
  const seen = new Set();

  for (const source of [alsoViewed, phase1]) {
    for (const product of source) {
      const id = String(product._id);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(product);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
};

module.exports = {
  RECOMMENDATION_SELECT,
  getProductRecommendations,
  getTrendingRecommendations,
  getAlsoViewedRecommendations,
  getHybridAlsoViewedRecommendations,
};
