const Product = require("../models/Product");
const Order = require("../models/Order");

// ─── Category Mapping ─────────────────────────────────────────────────────────
//
// Maps quiz option labels to the set of category strings actually used in the DB.
// Exact case-insensitive matches are preferred over substring regex so that
// "Shirts" does not bleed into "T-Shirts", "Jackets" matches "Blazers", etc.
// Add more variations here as the product catalogue grows.

const CATEGORY_MAPPINGS = {
  "T-Shirts":   ["T-Shirts", "T-Shirt", "Tees", "Tee"],
  "Shirts":     ["Shirts", "Shirt", "Dress Shirts", "Casual Shirts"],
  "Trousers":   ["Trousers", "Trouser", "Pants", "Pant"],
  "Chinos":     ["Chinos", "Chino", "Chino Pants", "Pants", "Pant"],
  "Jackets":    ["Jackets", "Jacket", "Blazers", "Blazer", "Outerwear"],
  "Shorts":     ["Shorts", "Short"],
  "Activewear": ["Activewear", "Sportswear", "Athletic", "Gym Wear", "Outerwear"],
  "Accessories":["Accessories", "Accessory", "Accessoires"],
};

// ─── Budget Filters ───────────────────────────────────────────────────────────

const BUDGET_FILTERS = {
  "Under LKR 2,000":    { $lt: 2000 },
  "LKR 2,000\u20134,000": { $gte: 2000, $lte: 4000 },
  "LKR 4,000\u20137,000": { $gt: 4000,  $lte: 7000 },
  "LKR 7,000+":          { $gt: 7000 },
};

// ─── Keyword Tables ───────────────────────────────────────────────────────────

const FIT_KEYWORDS = {
  "Slim Fit":    ["slim"],
  "Regular Fit": ["regular"],
  "Relaxed Fit": ["relaxed"],
  "Oversized":   ["oversized"],
};

const STYLE_KEYWORDS = {
  "Classic & Timeless":   ["classic"],
  "Streetwear & Trends":  ["street", "streetwear", "urban"],
  "Smart Casual":         ["casual", "smart"],
  "Minimalist":           ["minimal", "minimalist", "clean"],
};

const OCCASION_KEYWORDS = {
  "Everyday Casual": ["casual", "everyday"],
  "Formal & Office": ["formal", "office", "business"],
  "Night Out":       ["night", "party", "evening"],
  "Active & Sport":  ["sport", "active", "gym", "athletic"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns $or conditions that match any DB variation for the selected quiz categories.
 * Uses anchored (^...$) case-insensitive regex to avoid substring bleed.
 */
function buildCategoryConditions(quizCategories) {
  const allVariations = quizCategories.flatMap(
    (cat) => CATEGORY_MAPPINGS[cat] || [cat]
  );
  // Deduplicate (e.g. Trousers and Chinos both map to "Pants")
  const unique = [...new Set(allVariations)];
  return unique.map((v) => ({
    category: { $regex: `^${escapeRegex(v)}$`, $options: "i" },
  }));
}

/**
 * Keyword match. Searches name only when description is absent/empty
 * to avoid penalising products without descriptions.
 */
function hasKeyword(name, description, keywords) {
  const text = description && description.trim()
    ? `${name || ""} ${description}`.toLowerCase()
    : (name || "").toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function buildStyleSummary(style, fit, colorMood, budget) {
  const budgetShort = (budget || "")
    .replace("Under LKR 2,000",         "<LKR 2k")
    .replace("LKR 2,000\u20134,000",    "LKR 2k\u20134k")
    .replace("LKR 4,000\u20137,000",    "LKR 4k\u20137k")
    .replace("LKR 7,000+",              "LKR 7k+");
  return [style, fit, colorMood, budgetShort].filter(Boolean).join(" \u00b7 ");
}

const PRODUCT_SELECT =
  "name description category price stock images createdAt trendingScore";

// ─── Progressive candidate fetch ──────────────────────────────────────────────
//
// Attempt 1: category match + price + stock
// Attempt 2: price + stock only (category relaxed)
// Attempt 3: stock + active only (price relaxed)
// Attempt 4: return anything active + in-stock
//
// Returns { candidates, isFallback }

async function fetchCandidates({ categoryConditions, priceFilter, excludedIds }) {
  const base = { status: "active", stock: { $gt: 0 } };
  if (excludedIds.length > 0) base._id = { $nin: excludedIds };

  const hasCategoryFilter = categoryConditions.length > 0;
  const hasPriceFilter    = Object.keys(priceFilter).length > 0;

  // Attempt 1 — category + price
  if (hasCategoryFilter) {
    const q = { ...base, $or: categoryConditions };
    if (hasPriceFilter) q.price = priceFilter;
    const results = await Product.find(q).select(PRODUCT_SELECT).lean();
    if (results.length >= 4) return { candidates: results, isFallback: false };
  }

  // Attempt 2 — price only (drop category)
  if (hasPriceFilter) {
    const q = { ...base, price: priceFilter };
    const results = await Product.find(q).select(PRODUCT_SELECT).lean();
    if (results.length >= 4) return { candidates: results, isFallback: true };
  }

  // Attempt 3 — stock + active only (drop both filters)
  const results3 = await Product.find(base).select(PRODUCT_SELECT).lean();
  if (results3.length >= 4) return { candidates: results3, isFallback: true };

  // Attempt 4 — absolute fallback: whatever is in the DB
  const results4 = await Product.find({ status: "active" })
    .select(PRODUCT_SELECT)
    .lean();
  return { candidates: results4, isFallback: true };
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function getQuizRecommendations({
  userId,
  occasion,
  fit,
  colorMood,
  budget,
  style,
  categories,
}) {
  const cats = Array.isArray(categories) ? categories : [];
  const styleSummary = buildStyleSummary(style, fit, colorMood, budget);

  if (cats.length === 0) {
    return { products: [], styleSummary, totalFound: 0, isFallback: false };
  }

  // Exclude already-purchased products
  const purchasedOrders = await Order.find({
    user: userId,
    status: { $nin: ["CART"] },
  })
    .select("items.product")
    .lean();

  const excludedIds = purchasedOrders.flatMap((o) =>
    (o.items || []).map((i) => String(i.product))
  );

  const categoryConditions = buildCategoryConditions(cats);
  const priceFilter        = BUDGET_FILTERS[budget] || {};

  const { candidates, isFallback } = await fetchCandidates({
    categoryConditions,
    priceFilter,
    excludedIds,
  });

  if (candidates.length === 0) {
    return { products: [], styleSummary, totalFound: 0, isFallback: true };
  }

  const totalFound = candidates.length;

  // Determine if trending data is meaningful (skip component if all zero)
  const maxTrending = Math.max(...candidates.map((p) => p.trendingScore || 0));
  const hasTrendingData = maxTrending > 0;

  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  const fitKeywords      = FIT_KEYWORDS[fit]           || [];
  const styleKeywords    = STYLE_KEYWORDS[style]        || [];
  const occasionKeywords = OCCASION_KEYWORDS[occasion]  || [];

  // Score each candidate
  const scored = candidates.map((product) => {
    const { name, description, category, trendingScore, createdAt } = product;
    let score = 0;

    // Category match: +30
    const catMatches = categoryConditions.some((cond) =>
      new RegExp(cond.category.$regex, cond.category.$options).test(category)
    );
    if (catMatches) score += 30;

    // Price in range: +25 (all non-fallback candidates already pass price filter,
    // check explicitly for fallback candidates)
    const priceOk =
      !hasPriceFilter(priceFilter) || productInPriceRange(product.price, priceFilter);
    if (priceOk) score += 25;

    // Trending: +0–20 (only when data exists)
    let trendPoints = 0;
    if (hasTrendingData) {
      trendPoints = ((trendingScore || 0) / maxTrending) * 20;
      score += trendPoints;
    }

    // New arrival (< 14 days): +10
    const isNew =
      createdAt && now - new Date(createdAt).getTime() < FOURTEEN_DAYS_MS;
    if (isNew) score += 10;

    // Fit keyword: +10
    const fitMatch =
      fitKeywords.length > 0 && hasKeyword(name, description, fitKeywords);
    if (fitMatch) score += 10;

    // Style keyword: +5
    const styleMatch =
      styleKeywords.length > 0 && hasKeyword(name, description, styleKeywords);
    if (styleMatch) score += 5;

    // Occasion keyword: +5
    const occMatch =
      occasionKeywords.length > 0 && hasKeyword(name, description, occasionKeywords);
    if (occMatch) score += 5;

    // Reason — most specific matching signal wins
    let reason;
    if (fitMatch) {
      reason = `Matches your ${fit.toLowerCase()} preference`;
    } else if (styleMatch) {
      reason = `Matches your ${style.toLowerCase()} preference`;
    } else if (hasTrendingData && trendPoints >= 10) {
      reason = "Trending in your budget range";
    } else if (isNew) {
      reason = "Just arrived \u2014 fresh pick for you";
    } else if (catMatches) {
      reason = `Perfect for your ${category} search`;
    } else {
      reason = "A great pick for your style";
    }

    return { product, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  const products = scored.slice(0, 12).map(({ product, reason }) => ({
    ...product,
    reason,
  }));

  return { products, styleSummary, totalFound, isFallback };
}

// ─── Internal price helpers ───────────────────────────────────────────────────

function hasPriceFilter(filter) {
  return Object.keys(filter).length > 0;
}

function productInPriceRange(price, filter) {
  if (filter.$lt  !== undefined && price >= filter.$lt)  return false;
  if (filter.$lte !== undefined && price > filter.$lte)  return false;
  if (filter.$gte !== undefined && price < filter.$gte)  return false;
  if (filter.$gt  !== undefined && price <= filter.$gt)  return false;
  return true;
}

module.exports = { getQuizRecommendations };
