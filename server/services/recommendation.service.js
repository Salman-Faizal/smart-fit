const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");

const RECOMMENDATION_SELECT =
  "name price images category views purchases stock createdAt";

const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 60;
const CANDIDATE_POOL_SIZE = 400;

const WEIGHTS = {
  categoryMatch: 42,
  recentViewedProduct: 22,
  recentViewedCategory: 18,
  purchasedProduct: 28,
  purchasedCategory: 16,
  purchasesSignal: 20,
  viewsSignal: 14,
  recencySignal: 12,
  stockSignal: 6,
};

const normalizeLimit = (limit, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
};

const normalizeMetric = (value, max) => {
  const safe = Number(value) || 0;
  if (!max || max <= 0) return 0;
  return Math.min(safe / max, 1);
};

const recencyScore = (dateValue) => {
  const createdAt = new Date(dateValue);
  if (Number.isNaN(createdAt.getTime())) return 0;

  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 90) return 0.5;
  if (ageDays <= 180) return 0.25;
  return 0.1;
};

const calculateCandidateScore = ({
  candidate,
  anchorCategory,
  recentViewedSet,
  recentCategorySet,
  purchasedSet,
  purchasedCategorySet,
  maxPurchases,
  maxViews,
}) => {
  let score = 0;

  if (anchorCategory && candidate.category === anchorCategory) {
    score += WEIGHTS.categoryMatch;
  }

  const candidateId = String(candidate._id);

  if (recentViewedSet.has(candidateId)) {
    score += WEIGHTS.recentViewedProduct;
  }

  if (candidate.category && recentCategorySet.has(candidate.category)) {
    score += WEIGHTS.recentViewedCategory;
  }

  if (purchasedSet.has(candidateId)) {
    score += WEIGHTS.purchasedProduct;
  }

  if (candidate.category && purchasedCategorySet.has(candidate.category)) {
    score += WEIGHTS.purchasedCategory;
  }

  score +=
    normalizeMetric(candidate.purchases, maxPurchases) *
    WEIGHTS.purchasesSignal;

  score += normalizeMetric(candidate.views, maxViews) * WEIGHTS.viewsSignal;

  score += recencyScore(candidate.createdAt) * WEIGHTS.recencySignal;

  if (Number(candidate.stock || 0) > 0) {
    score += WEIGHTS.stockSignal;
  } else {
    score -= WEIGHTS.stockSignal * 2;
  }

  return score;
};

const dedupeProducts = (products = []) => {
  const output = [];
  const seen = new Set();

  for (const product of products) {
    const id = String(product._id);
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(product);
  }

  return output;
};

const diversifyResults = (rankedProducts, limit) => {
  const byCategory = new Map();

  for (const product of rankedProducts) {
    const key = product.category || "uncategorized";
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
    }
    byCategory.get(key).push(product);
  }

  const selected = [];
  const seen = new Set();

  while (selected.length < limit) {
    let progressed = false;

    for (const queue of byCategory.values()) {
      while (queue.length) {
        const next = queue.shift();
        const id = String(next._id);
        if (seen.has(id)) continue;

        seen.add(id);
        selected.push(next);
        progressed = true;
        break;
      }

      if (selected.length >= limit) break;
    }

    if (!progressed) break;
  }

  return selected;
};

const getRecentContext = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      recentViewedSet: new Set(),
      recentCategorySet: new Set(),
      purchasedSet: new Set(),
      purchasedCategorySet: new Set(),
    };
  }

  const user = await User.findById(userId).select(
    "recentlyViewed purchasedProducts",
  );

  const recentlyViewed = (user?.recentlyViewed || []).map(String);
  const purchasedProducts = (user?.purchasedProducts || []).map(String);
  const relatedIds = [...new Set([...recentlyViewed, ...purchasedProducts])];

  if (!relatedIds.length) {
    return {
      recentViewedSet: new Set(recentlyViewed),
      recentCategorySet: new Set(),
      purchasedSet: new Set(purchasedProducts),
      purchasedCategorySet: new Set(),
    };
  }

  const relatedProducts = await Product.find({
    _id: { $in: relatedIds },
  }).select("_id category");

  const productById = new Map(
    relatedProducts.map((product) => [String(product._id), product]),
  );

  const recentCategories = recentlyViewed
    .map((id) => productById.get(id)?.category)
    .filter(Boolean);

  const purchasedCategories = purchasedProducts
    .map((id) => productById.get(id)?.category)
    .filter(Boolean);

  return {
    recentViewedSet: new Set(recentlyViewed),
    recentCategorySet: new Set(recentCategories),
    purchasedSet: new Set(purchasedProducts),
    purchasedCategorySet: new Set(purchasedCategories),
  };
};

const getTrendingRecommendations = async ({
  category,
  limit = DEFAULT_LIMIT,
  excludeProductId,
} = {}) => {
  const normalizedLimit = normalizeLimit(limit);

  const baseQuery = {};
  if (excludeProductId && mongoose.Types.ObjectId.isValid(excludeProductId)) {
    baseQuery._id = { $ne: excludeProductId };
  }

  const categoryQuery = category ? { ...baseQuery, category } : baseQuery;

  const primary = await Product.find(categoryQuery)
    .select(RECOMMENDATION_SELECT)
    .limit(Math.max(normalizedLimit * 2, normalizedLimit));

  let candidates = primary;

  if (candidates.length < normalizedLimit) {
    const fallback = await Product.find(baseQuery)
      .select(RECOMMENDATION_SELECT)
      .limit(Math.max(normalizedLimit * 4, normalizedLimit));

    candidates = dedupeProducts([...candidates, ...fallback]);
  }

  if (!candidates.length) return [];

  const maxPurchases = Math.max(
    ...candidates.map((item) => item.purchases || 0),
    1,
  );

  const maxViews = Math.max(...candidates.map((item) => item.views || 0), 1);

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score:
        normalizeMetric(candidate.purchases, maxPurchases) *
          WEIGHTS.purchasesSignal +
        normalizeMetric(candidate.views, maxViews) * WEIGHTS.viewsSignal +
        recencyScore(candidate.createdAt) * WEIGHTS.recencySignal +
        (candidate.stock > 0 ? WEIGHTS.stockSignal : -WEIGHTS.stockSignal * 2),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);

  return diversifyResults(ranked, normalizedLimit);
};

const getProductRecommendations = async ({
  productId,
  userId,
  limit = DEFAULT_LIMIT,
}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("Invalid product id");
    error.statusCode = 400;
    throw error;
  }

  const normalizedLimit = normalizeLimit(limit);

  const targetProduct =
    await Product.findById(productId).select("_id category");

  if (!targetProduct) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const userContext = await getRecentContext(userId);

  const candidates = await Product.find({
    _id: { $ne: targetProduct._id },
  })
    .select(RECOMMENDATION_SELECT)
    .limit(Math.max(CANDIDATE_POOL_SIZE, normalizedLimit * 8));

  if (!candidates.length) return [];

  const maxPurchases = Math.max(
    ...candidates.map((item) => item.purchases || 0),
    1,
  );

  const maxViews = Math.max(...candidates.map((item) => item.views || 0), 1);

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: calculateCandidateScore({
        candidate,
        anchorCategory: targetProduct.category,
        maxPurchases,
        maxViews,
        ...userContext,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);

  const diversified = diversifyResults(dedupeProducts(ranked), normalizedLimit);

  if (diversified.length >= normalizedLimit) {
    return diversified;
  }

  const fallbackTrending = await getTrendingRecommendations({
    category: targetProduct.category,
    limit: normalizedLimit,
    excludeProductId: targetProduct._id,
  });

  return dedupeProducts([...diversified, ...fallbackTrending]).slice(
    0,
    normalizedLimit,
  );
};

module.exports = {
  RECOMMENDATION_SELECT,
  getProductRecommendations,
  getTrendingRecommendations,
  normalizeLimit,
};
