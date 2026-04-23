const Product = require("../models/Product");
const Order = require("../models/Order");

// ─── Category Mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAPPINGS = {
  "T-Shirts":    ["T-Shirts", "T-Shirt", "Tees", "Tee"],
  "Shirts":      ["Shirts", "Shirt", "Dress Shirts", "Casual Shirts"],
  "Trousers":    ["Trousers", "Trouser", "Pants", "Pant"],
  "Chinos":      ["Chinos", "Chino", "Chino Pants", "Pants", "Pant"],
  "Jackets":     ["Jackets", "Jacket", "Blazers", "Blazer", "Outerwear"],
  "Shorts":      ["Shorts", "Short"],
  "Activewear":  ["Activewear", "Sportswear", "Athletic", "Gym Wear", "Outerwear"],
  "Accessories": ["Accessories", "Accessory", "Accessoires"],
};

// ─── Budget Filters ───────────────────────────────────────────────────────────

const BUDGET_FILTERS = {
  "Under LKR 2,000":         { $lt: 2000 },
  "LKR 2,000–4,000":    { $gte: 2000, $lte: 4000 },
  "LKR 4,000–7,000":    { $gt: 4000,  $lte: 7000 },
  "LKR 7,000+":               { $gt: 7000 },
};

// ─── Quiz answer → schema enum mappings ──────────────────────────────────────

const FIT_SCHEMA_MAP = {
  "Slim Fit":    "Slim",
  "Regular Fit": "Regular",
  "Relaxed Fit": "Relaxed",
  "Oversized":   "Oversized",
};

const STYLE_SCHEMA_MAP = {
  "Classic & Timeless":  "Classic",
  "Streetwear & Trends": "Streetwear",
  "Smart Casual":        "Smart Casual",
  "Minimalist":          "Minimalist",
};

const OCCASION_SCHEMA_MAP = {
  "Everyday Casual": "Casual",
  "Formal & Office": "Formal",
  "Night Out":       "Night Out",
  "Active & Sport":  "Active",
};

// ─── Keyword Tables (fallback when schema field is null) ──────────────────────

const FIT_KEYWORDS = {
  "Slim Fit":    ["slim"],
  "Regular Fit": ["regular"],
  "Relaxed Fit": ["relaxed"],
  "Oversized":   ["oversized"],
};

const STYLE_KEYWORDS = {
  "Classic & Timeless":  ["classic"],
  "Streetwear & Trends": ["street", "streetwear", "urban"],
  "Smart Casual":        ["casual", "smart"],
  "Minimalist":          ["minimal", "minimalist", "clean"],
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

function buildCategoryConditions(quizCategories) {
  const allVariations = quizCategories.flatMap(
    (cat) => CATEGORY_MAPPINGS[cat] || [cat]
  );
  const unique = [...new Set(allVariations)];
  return unique.map((v) => ({
    category: { $regex: `^${escapeRegex(v)}$`, $options: "i" },
  }));
}

function hasKeyword(name, description, keywords) {
  const text = description && description.trim()
    ? `${name || ""} ${description}`.toLowerCase()
    : (name || "").toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function buildStyleSummary(style, fit, colorMood, budget) {
  const budgetShort = (budget || "")
    .replace("Under LKR 2,000",      "<LKR 2k")
    .replace("LKR 2,000–4,000", "LKR 2k–4k")
    .replace("LKR 4,000–7,000", "LKR 4k–7k")
    .replace("LKR 7,000+",           "LKR 7k+");
  return [style, fit, colorMood, budgetShort].filter(Boolean).join(" · ");
}

const PRODUCT_SELECT =
  "name description category price stock images primaryImage createdAt trendingScore fit style occasion colorFamily";

// ─── Progressive candidate fetch ─────────────────────────────────────────────

async function fetchCandidates({ categoryConditions, priceFilter, excludedIds }) {
  const base = { status: "active", stock: { $gt: 0 } };
  if (excludedIds.length > 0) base._id = { $nin: excludedIds };

  const hasCategoryFilter = categoryConditions.length > 0;
  const hasPriceFilter    = Object.keys(priceFilter).length > 0;

  // Attempt 1 — category + price (genuine matches)
  if (hasCategoryFilter) {
    const q = { ...base, $or: categoryConditions };
    if (hasPriceFilter) q.price = priceFilter;
    const results = await Product.find(q).select(PRODUCT_SELECT).lean();
    if (results.length >= 4) return { candidates: results, fallbackLevel: 1 };
  }

  // Attempt 2 — price only, drop category (relaxed category)
  if (hasPriceFilter) {
    const q = { ...base, price: priceFilter };
    const results = await Product.find(q).select(PRODUCT_SELECT).lean();
    if (results.length >= 4) return { candidates: results, fallbackLevel: 2 };
  }

  // Attempt 3 — stock + active only, drop both (relaxed price)
  const results3 = await Product.find(base).select(PRODUCT_SELECT).lean();
  if (results3.length >= 4) return { candidates: results3, fallbackLevel: 3 };

  // Attempt 4 — same base, accept any count (including 0)
  return { candidates: results3, fallbackLevel: 4 };
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
    return { products: [], styleSummary, totalFound: 0, fallbackLevel: 0, isFallback: false };
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

  const { candidates, fallbackLevel } = await fetchCandidates({
    categoryConditions,
    priceFilter,
    excludedIds,
  });

  if (candidates.length === 0) {
    return { products: [], styleSummary, totalFound: 0, fallbackLevel, isFallback: true };
  }

  const totalFound  = candidates.length;
  const maxTrending = Math.max(...candidates.map((p) => p.trendingScore || 0));
  const hasTrendingData = maxTrending > 0;

  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  const fitSchemaValue    = FIT_SCHEMA_MAP[fit]      || null;
  const styleSchemaValue  = STYLE_SCHEMA_MAP[style]  || null;
  const occasionSchemaVal = OCCASION_SCHEMA_MAP[occasion] || null;

  const fitKeywords      = FIT_KEYWORDS[fit]          || [];
  const styleKeywords    = STYLE_KEYWORDS[style]       || [];
  const occasionKeywords = OCCASION_KEYWORDS[occasion] || [];

  const scored = candidates.map((product) => {
    const { name, description, category, trendingScore, createdAt } = product;
    let score = 0;
    const matchSignals = [];

    // Category match: +30
    const catMatches = categoryConditions.some((cond) =>
      new RegExp(cond.category.$regex, cond.category.$options).test(category)
    );
    if (catMatches) score += 30;

    // Price in range: +25
    const priceOk = !hasPriceFilter(priceFilter) || productInPriceRange(product.price, priceFilter);
    if (priceOk) score += 25;

    // Trending: +0–20
    let trendPoints = 0;
    if (hasTrendingData) {
      trendPoints = ((trendingScore || 0) / maxTrending) * 20;
      score += trendPoints;
    }

    // New arrival < 14 days: +10
    const isNew = createdAt && now - new Date(createdAt).getTime() < FOURTEEN_DAYS_MS;
    if (isNew) score += 10;

    // Fit: schema field (+20) else keyword fallback (+10)
    let fitMatch = false;
    if (fitSchemaValue && product.fit) {
      if (product.fit === fitSchemaValue) { score += 20; matchSignals.push("fit-schema"); fitMatch = true; }
    } else if (fitKeywords.length > 0 && hasKeyword(name, description, fitKeywords)) {
      score += 10; matchSignals.push("fit-keyword"); fitMatch = true;
    }

    // Style: schema field (+15) else keyword fallback (+5)
    let styleMatch = false;
    if (styleSchemaValue && product.style) {
      if (product.style === styleSchemaValue) { score += 15; matchSignals.push("style-schema"); styleMatch = true; }
    } else if (styleKeywords.length > 0 && hasKeyword(name, description, styleKeywords)) {
      score += 5; matchSignals.push("style-keyword"); styleMatch = true;
    }

    // Occasion: schema field (+15) else keyword fallback (+5)
    if (occasionSchemaVal && product.occasion) {
      if (product.occasion === occasionSchemaVal) { score += 15; matchSignals.push("occasion-schema"); }
    } else if (occasionKeywords.length > 0 && hasKeyword(name, description, occasionKeywords)) {
      score += 5; matchSignals.push("occasion-keyword");
    }

    // Color family: schema field (+10)
    if (colorMood && product.colorFamily && product.colorFamily === colorMood) {
      score += 10; matchSignals.push("color-schema");
    }

    // Build reason string (most specific match wins)
    let reason;
    if (matchSignals.includes("fit-schema")) {
      reason = `Matched your ${fitSchemaValue} fit preference`;
    } else if (matchSignals.includes("style-schema")) {
      reason = `Matches your ${styleSchemaValue} style`;
    } else if (matchSignals.includes("occasion-schema")) {
      reason = `Great for ${occasionSchemaVal.toLowerCase()} occasions`;
    } else if (matchSignals.includes("color-schema")) {
      reason = `In your preferred ${colorMood} palette`;
    } else if (fitMatch) {
      reason = `Matches your ${(fit || "").toLowerCase()} preference`;
    } else if (styleMatch) {
      reason = `Matches your ${(style || "").toLowerCase()} vibe`;
    } else if (hasTrendingData && trendPoints >= 10) {
      reason = "Trending in your budget range";
    } else if (isNew) {
      reason = "Just arrived — fresh pick for you";
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

  return {
    products,
    styleSummary,
    totalFound,
    fallbackLevel,
    isFallback: fallbackLevel >= 3,
  };
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
