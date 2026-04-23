/**
 * forYou.service.js
 *
 * Personalized "Top Picks For You" recommendation pipeline.
 *
 * Step 1 — Taste profile
 *   Sources: ProductInteraction (primary, weighted) + User.recentlyViewed /
 *   purchasedProducts (legacy fallback for users who predate the new tracking
 *   system). Product has no color/style fields, so those signals are skipped.
 *
 * Step 2 — Candidate selection
 *   Products in the user's top-3 categories, in stock, excluding:
 *     • products already purchased
 *     • products viewed > 3 times (they've seen it, not buying it)
 *     • products the caller marks as already displayed (Trending Now, etc.)
 *
 * Step 3 — Scoring per candidate
 *   score = categoryMatch(0–40) + priceProximity(0–30) +
 *           trendingBonus(0–20)  + newArrivalBonus(0 or 10)
 *
 * Step 4 — Return top 12, split into top-6 / bottom-6 each separately
 *   shuffled so the same quality tier appears but never in rigid rank order.
 *
 * Cache — 30-minute in-memory Map keyed by userId. Resets on server restart
 * (acceptable — warm reads serve in < 5ms, cold builds in < 300ms).
 */

const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductInteraction = require("../models/ProductInteraction");
const User = require("../models/User");
const { getTrendingProductsWithRanks } = require("./recommendation.service");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLD_START_THRESHOLD = 5; // total interactions needed to personalise
const RESULT_LIMIT = 12;
const CANDIDATE_FETCH_LIMIT = 300; // products to score before ranking
const MAX_ALLOWED_VIEWS = 3; // products seen more than this many times are excluded
const NEW_ARRIVAL_DAYS = 14;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Interaction weights — intentionally matching the trendingScore formula
// so the two systems stay aligned.
const EVENT_WEIGHTS = { purchase: 6, cart: 4, wishlist: 3, view: 1 };

// Score component maxima (for the formula in the spec):
//   categoryMatch   × 40
//   priceProximity  × 30
//   trendingBonus   × 20
//   newArrivalBonus × 10

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map();

function getCached(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.data;
}

function setCache(userId, data) {
  cache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Allow the admin recalculate endpoint to bust a single user's cache. */
function bustCache(userId) {
  cache.delete(userId);
}

// ---------------------------------------------------------------------------
// Helper: shuffle an array in-place (Fisher-Yates)
// ---------------------------------------------------------------------------

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Split arr into [0..topN) and [topN..end), shuffle each half separately,
 * then rejoin. Keeps quality tiers intact while breaking strict rank order.
 */
function splitShuffle(arr, topN = 6) {
  return [...shuffle(arr.slice(0, topN)), ...shuffle(arr.slice(topN))];
}

// ---------------------------------------------------------------------------
// Helper: median of a numeric array
// ---------------------------------------------------------------------------

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Step 1 — Build taste profile
// ---------------------------------------------------------------------------

/**
 * Builds a taste profile for the user by merging:
 *   A) ProductInteraction records (primary, weighted by event type)
 *   B) User.recentlyViewed + purchasedProducts (legacy arrays for users who
 *      predate the tracking system — each legacy touch counts as "view" weight)
 *
 * Returns { isColdStart, topCategories, medianPrice, viewCounts, purchasedPids }
 */
async function buildTasteProfile(userId) {
  // ── A: ProductInteraction (weighted) ─────────────────────────────────────
  const interactions = await ProductInteraction.find({ userId })
    .sort({ timestamp: -1 })
    .limit(200)
    .lean();

  const interactedProductIds = [
    ...new Set(interactions.map((i) => i.productId.toString())),
  ];

  // ── B: Legacy User model arrays ───────────────────────────────────────────
  const user = await User.findById(userId)
    .select("recentlyViewed viewedProducts purchasedProducts")
    .lean();

  const legacyViewedIds = [
    ...(user?.recentlyViewed || []),
    ...(user?.viewedProducts || []),
  ].map(String);

  const legacyPurchasedIds = (user?.purchasedProducts || []).map(String);

  const legacyProductIds = [
    ...new Set([...legacyViewedIds, ...legacyPurchasedIds]),
  ];

  // ── Cold-start gate ───────────────────────────────────────────────────────
  const totalSignals =
    interactions.length +
    legacyViewedIds.length +
    legacyPurchasedIds.length;

  if (totalSignals < COLD_START_THRESHOLD) {
    return { isColdStart: true };
  }

  // ── Fetch product metadata for all touched products ───────────────────────
  const allProductIds = [
    ...new Set([...interactedProductIds, ...legacyProductIds]),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  const products = await Product.find({ _id: { $in: allProductIds } })
    .select("_id category price")
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // ── Aggregate category scores + per-product view counts ──────────────────
  const categoryScores = {};
  const viewCounts = {}; // { [productId]: number } — from ProductInteraction
  const purchasedPids = new Set();
  const wishlistedPids = new Set();
  const pricePool = []; // prices of meaningfully-interacted products

  // From ProductInteraction (weighted)
  for (const interaction of interactions) {
    const pid = interaction.productId.toString();
    const product = productMap.get(pid);
    if (!product) continue;

    const weight = EVENT_WEIGHTS[interaction.eventType] ?? 1;
    categoryScores[product.category] =
      (categoryScores[product.category] ?? 0) + weight;

    if (interaction.eventType === "view") {
      viewCounts[pid] = (viewCounts[pid] ?? 0) + 1;
    }
    if (interaction.eventType === "purchase") purchasedPids.add(pid);
    if (interaction.eventType === "wishlist") wishlistedPids.add(pid);

    // Price signal: products with strong interest (wishlist / cart / purchase,
    // or viewed more than once)
    if (
      ["wishlist", "cart", "purchase"].includes(interaction.eventType) ||
      (viewCounts[pid] ?? 0) > 1
    ) {
      if (product.price != null) pricePool.push(product.price);
    }
  }

  // From legacy arrays (each touch = view weight = 1)
  for (const pid of legacyViewedIds) {
    if (viewCounts[pid] !== undefined) continue; // already counted above
    const product = productMap.get(pid);
    if (!product) continue;
    categoryScores[product.category] =
      (categoryScores[product.category] ?? 0) + EVENT_WEIGHTS.view;
    viewCounts[pid] = (viewCounts[pid] ?? 0) + 1;
  }

  for (const pid of legacyPurchasedIds) {
    const product = productMap.get(pid);
    if (!product) continue;
    categoryScores[product.category] =
      (categoryScores[product.category] ?? 0) + EVENT_WEIGHTS.purchase;
    purchasedPids.add(pid);
    if (product.price != null) pricePool.push(product.price);
  }

  // ── Top 3 categories ──────────────────────────────────────────────────────
  const topCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, score]) => ({ category, score }));

  const medianPrice = median(pricePool);

  return {
    isColdStart: false,
    topCategories,
    medianPrice,
    viewCounts,
    purchasedPids,
    wishlistedPids,
  };
}

// ---------------------------------------------------------------------------
// Step 3 — Score a single candidate
// ---------------------------------------------------------------------------

/**
 * Returns { score, reason } for one product against the user's profile.
 *
 * Reason priority (highest personal signal wins):
 *   1. Top-1 category match   → "Because you love {category}"
 *   2. Top-2/3 category match → "Popular in {category}"
 *   3. New arrival             → "New arrival in {category}"
 *   4. High trending           → "Trending in {category}"
 *   5. Price proximity         → "Matches your price range"
 *   6. Default                 → "Handpicked for you"
 */
function scoreCandidate(product, profile, maxTrendingScore) {
  const { topCategories, medianPrice } = profile;

  // 1. Category match (0–40)
  const categoryRank = topCategories.findIndex(
    (c) => c.category === product.category,
  );
  // Rank 0 = best match (1.0), rank 1 = 0.75, rank 2 = 0.5, no match = 0
  const categoryWeight =
    categoryRank === 0
      ? 1.0
      : categoryRank === 1
        ? 0.75
        : categoryRank === 2
          ? 0.5
          : 0;
  const categoryScore = categoryWeight * 40;

  // 2. Price proximity (0–30)
  let priceScore = 0;
  if (medianPrice != null && product.price != null) {
    const diff = Math.abs(product.price - medianPrice);
    const proximity = Math.max(0, 1 - diff / Math.max(medianPrice, 1));
    priceScore = proximity * 30;
  }

  // 3. Trending bonus (0–20)
  const trendingNorm =
    maxTrendingScore > 0
      ? Math.min((product.trendingScore ?? 0) / maxTrendingScore, 1)
      : 0;
  const trendingScore = trendingNorm * 20;

  // 4. New arrival bonus (0 or 10)
  const ageDays =
    (Date.now() - new Date(product.createdAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const isNewArrival = ageDays <= NEW_ARRIVAL_DAYS;
  const newArrivalScore = isNewArrival ? 10 : 0;

  const totalScore = categoryScore + priceScore + trendingScore + newArrivalScore;

  // ── Reason string ─────────────────────────────────────────────────────────
  let reason;
  if (categoryRank === 0) {
    reason = `Because you love ${product.category}`;
  } else if (categoryRank >= 1 && categoryRank <= 2) {
    reason = `Popular in ${product.category}`;
  } else if (isNewArrival) {
    reason = `New arrival in ${product.category}`;
  } else if (trendingNorm > 0.4) {
    reason = `Trending in ${product.category}`;
  } else if (priceScore > 15) {
    reason = `Matches your price range`;
  } else {
    reason = `Handpicked for you`;
  }

  return { score: totalScore, reason };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * getTopPicksForUser({ userId, excludeIds })
 *
 * @param {string} userId       — authenticated user's MongoDB ObjectId string
 * @param {string[]} excludeIds — product IDs already visible on the page
 *                                (e.g. Trending Now products for this session)
 * @returns {{ products, isColdStart, label }}
 */
async function getTopPicksForUser({ userId, excludeIds = [] } = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("Invalid user id");
    err.statusCode = 400;
    throw err;
  }

  // ── Cache hit ─────────────────────────────────────────────────────────────
  // Note: cache key ignores excludeIds intentionally — the exclude list changes
  // per page-load (different trending shuffle) but the underlying picks don't.
  // The frontend can hide duplicates locally if needed.
  const cached = getCached(userId);
  if (cached) return cached;

  // ── Step 1: Taste profile ─────────────────────────────────────────────────
  const profile = await buildTasteProfile(userId);

  if (profile.isColdStart) {
    // Cold start: surface trending products with a softer label.
    const trendingProducts = await getTrendingProductsWithRanks({ limit: 12 });
    const coldProducts = trendingProducts.map((p) => ({
      ...p,
      reason: `Trending in ${p.category}`,
    }));

    const result = {
      products: coldProducts,
      isColdStart: true,
      label: "Popular Right Now — Curated For You",
    };

    setCache(userId, result);
    return result;
  }

  // ── Step 2: Candidate selection ───────────────────────────────────────────
  const topCategoryNames = profile.topCategories.map((c) => c.category);

  // Excluded: caller-supplied IDs + purchased products
  const excludeSet = new Set([
    ...excludeIds.map(String),
    ...profile.purchasedPids,
  ]);

  // Products viewed too many times (user is ignoring them)
  const overviewedPids = new Set(
    Object.entries(profile.viewCounts)
      .filter(([, count]) => count > MAX_ALLOWED_VIEWS)
      .map(([pid]) => pid),
  );

  // Build exclusion set for Mongo query
  const hardExcludeIds = [
    ...new Set([...excludeSet, ...overviewedPids]),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  const candidateQuery = {
    stock: { $gt: 0 },
    status: { $ne: "deleted" },
    category: { $in: topCategoryNames },
  };
  if (hardExcludeIds.length) {
    candidateQuery._id = { $nin: hardExcludeIds };
  }

  const candidates = await Product.find(candidateQuery)
    .select(
      "name description price images category stock createdAt trendingScore views purchases",
    )
    .limit(CANDIDATE_FETCH_LIMIT)
    .lean();

  // If we don't have enough candidates in top categories, broaden the query
  // to all in-stock products (keeping the exclude list)
  let finalCandidates = candidates;
  if (candidates.length < RESULT_LIMIT) {
    const broadQuery = { stock: { $gt: 0 }, status: { $ne: "deleted" } };
    if (hardExcludeIds.length) {
      broadQuery._id = { $nin: hardExcludeIds };
    }
    const broader = await Product.find(broadQuery)
      .select(
        "name description price images category stock createdAt trendingScore views purchases",
      )
      .limit(CANDIDATE_FETCH_LIMIT)
      .lean();
    // Dedupe: prefer category-matched candidates, append broader ones
    const seenIds = new Set(candidates.map((c) => c._id.toString()));
    finalCandidates = [
      ...candidates,
      ...broader.filter((p) => !seenIds.has(p._id.toString())),
    ];
  }

  if (!finalCandidates.length) {
    // Absolute fallback: cold-start trending
    const trendingProducts = await getTrendingProductsWithRanks({ limit: 12 });
    const result = {
      products: trendingProducts.map((p) => ({
        ...p,
        reason: `Trending in ${p.category}`,
      })),
      isColdStart: true,
      label: "Popular Right Now — Curated For You",
    };
    setCache(userId, result);
    return result;
  }

  // ── Step 3: Score each candidate ─────────────────────────────────────────
  const maxTrendingScore = Math.max(
    ...finalCandidates.map((p) => p.trendingScore ?? 0),
    1,
  );

  const scored = finalCandidates
    .map((product) => {
      const { score, reason } = scoreCandidate(
        product,
        profile,
        maxTrendingScore,
      );
      return { product, score, reason };
    })
    .sort((a, b) => b.score - a.score);

  // ── Step 4: Top 12, split-shuffle ─────────────────────────────────────────
  const top12 = scored.slice(0, RESULT_LIMIT);
  const shuffled = splitShuffle(
    top12.map(({ product, reason }) => ({ ...product, reason })),
    6,
  );

  const result = {
    products: shuffled,
    isColdStart: false,
    label: "Top Picks For You",
  };

  setCache(userId, result);
  return result;
}

module.exports = { getTopPicksForUser, bustCache, buildTasteProfile };
