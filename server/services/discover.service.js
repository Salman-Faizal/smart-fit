/**
 * discover.service.js
 *
 * Hybrid infinite-scroll feed for the "Discover More" home page section.
 *
 * Content ratio (per page of 12):
 *   40% (5) — Personalized: products from the user's known categories
 *   30% (4) — Discovery:    products from categories the user has NEVER seen
 *   20% (2) — Trending:     highest-trendingScore products not yet shown
 *   10% (1) — New arrivals: added in the last 30 days
 *
 * Pools are shuffled individually then interleaved in round-robin fashion so
 * discovery items are distributed throughout — not clustered at the bottom.
 *
 * Cursor pagination — stateless on the server:
 *   cursor = base64url(JSON.stringify(allAlreadySeenIds))
 *   On each request the server decodes the cursor, excludes those IDs from all
 *   pool queries, and encodes the new seen set into nextCursor.
 *   nextCursor: null signals the feed is exhausted.
 */

const mongoose = require("mongoose");
const Product = require("../models/Product");
const { buildTasteProfile } = require("./forYou.service");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCOVER_SELECT =
  "name description price images category stock createdAt trendingScore views purchases";

// Target items per pool for a page of 12
// Must sum to PAGE_SIZE.
const PAGE_SIZE = 12;
const POOL_RATIOS = { personalized: 5, discovery: 4, trending: 2, newArrival: 1 };

// Fetch this many per pool before deduplication — gives headroom when pools
// overlap (e.g. a trending product is also in the user's category).
const POOL_FETCH_MULT = 4;

const NEW_ARRIVAL_DAYS = 30;

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

/**
 * Encode an array of product ID strings into an opaque base64url cursor.
 * The client treats this as a black box.
 */
function encodeCursor(ids) {
  return Buffer.from(JSON.stringify(ids)).toString("base64url");
}

/**
 * Decode a cursor back to the array of excluded product IDs.
 * Returns [] on any parse error so a corrupted cursor degrades gracefully.
 */
function decodeCursor(cursor) {
  try {
    const ids = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Array helpers
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
 * Round-robin interleave of N pools so items from different pools alternate
 * throughout the result rather than clustering by pool.
 *
 * Each pool supplies `target` items. When a pool runs out early the
 * remaining slots cycle among the pools that still have items.
 */
function interleave(pools) {
  const queues = pools.map(({ items, target }) =>
    shuffle(items).slice(0, target),
  );

  const totalTarget = pools.reduce((s, p) => s + p.target, 0);
  const result = [];
  let i = 0;
  let emptyRounds = 0;

  while (result.length < totalTarget && emptyRounds < queues.length) {
    const queue = queues[i % queues.length];
    if (queue.length > 0) {
      result.push(queue.shift());
      emptyRounds = 0;
    } else {
      emptyRounds++;
    }
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pool labelling
// ---------------------------------------------------------------------------

/**
 * Attach poolType and poolLabel to each product.
 * poolLabel is what appears as the category chip in the UI:
 *   - New arrivals always show "New"
 *   - Trending pool shows "Trending"
 *   - Personalized / discovery pools show the actual category name
 */
function tagPool(items, poolType, overrideLabel) {
  return items.map((p) => ({
    ...p,
    poolType,
    poolLabel: overrideLabel ?? p.category,
  }));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * getDiscoverFeed({ userId, cursor, limit, excludeIds })
 *
 * @param {string|null}  userId     — authenticated user's ObjectId (or null for guests)
 * @param {string|null}  cursor     — opaque next-page token from previous response
 * @param {number}       limit      — items per page (default 12, max 48)
 * @param {string[]}     excludeIds — IDs already shown above on the page
 *                                    (Trending Now, Top Picks, etc.)
 * @returns {{ products, nextCursor, hasMore }}
 */
async function getDiscoverFeed({
  userId = null,
  cursor = null,
  limit = PAGE_SIZE,
  excludeIds = [],
} = {}) {
  const normalizedLimit = Math.min(Math.max(1, Number(limit) || PAGE_SIZE), 48);

  // ── Compute full exclusion set ─────────────────────────────────────────────
  const cursorIds = cursor ? decodeCursor(cursor) : [];

  const allExcludedIds = [
    ...new Set([
      ...excludeIds.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id)),
      ...cursorIds.filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ]),
  ];

  const excludeMongoFilter =
    allExcludedIds.length > 0 ? { _id: { $nin: allExcludedIds } } : {};

  // ── Pool size targets (scale to normalizedLimit, keeping 40/30/20/10 ratio)
  const scale = normalizedLimit / PAGE_SIZE;
  const targets = {
    personalized: Math.round(POOL_RATIOS.personalized * scale),
    discovery: Math.round(POOL_RATIOS.discovery * scale),
    trending: Math.round(POOL_RATIOS.trending * scale),
    newArrival: Math.max(1, Math.round(POOL_RATIOS.newArrival * scale)),
  };

  // Fix rounding drift so targets always sum exactly to normalizedLimit
  const rawSum = Object.values(targets).reduce((s, v) => s + v, 0);
  targets.personalized += normalizedLimit - rawSum;

  const fetchLimit = normalizedLimit * POOL_FETCH_MULT;

  // ── Build user taste profile (best-effort; falls back gracefully) ──────────
  let userCategorySet = new Set();
  const isGuest = !userId || !mongoose.Types.ObjectId.isValid(String(userId));

  if (!isGuest) {
    try {
      const profile = await buildTasteProfile(String(userId));
      if (!profile.isColdStart && profile.topCategories?.length) {
        userCategorySet = new Set(profile.topCategories.map((c) => c.category));
      }
    } catch {
      // Profile failures are silent — guest-like pool assignment kicks in
    }
  }

  // ── All available categories → derive novel (never-seen) categories ────────
  const allCategories = await Product.distinct("category", {
    stock: { $gt: 0 },
    status: { $ne: "deleted" },
  });
  const novelCategories = allCategories.filter((c) => !userCategorySet.has(c));

  // ── Fetch candidates for each pool concurrently ────────────────────────────
  const thirtyDaysAgo = new Date(
    Date.now() - NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000,
  );

  const [rawA, rawB, rawC, rawD] = await Promise.all([
    // Pool A — Personalized (user's known categories)
    userCategorySet.size > 0
      ? Product.find({
          ...excludeMongoFilter,
          stock: { $gt: 0 },
          status: { $ne: "deleted" },
          category: { $in: [...userCategorySet] },
        })
          .select(DISCOVER_SELECT)
          .sort({ trendingScore: -1, views: -1 })
          .limit(fetchLimit)
          .lean()
      : Product.find({ ...excludeMongoFilter, stock: { $gt: 0 }, status: { $ne: "deleted" } })
          .select(DISCOVER_SELECT)
          .sort({ trendingScore: -1 })
          .limit(fetchLimit)
          .lean(),

    // Pool B — Discovery (categories the user has never interacted with)
    novelCategories.length > 0
      ? Product.find({
          ...excludeMongoFilter,
          stock: { $gt: 0 },
          status: { $ne: "deleted" },
          category: { $in: novelCategories },
        })
          .select(DISCOVER_SELECT)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .lean()
      : Product.find({ ...excludeMongoFilter, stock: { $gt: 0 }, status: { $ne: "deleted" } })
          .select(DISCOVER_SELECT)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .lean(),

    // Pool C — Trending (highest trendingScore not excluded)
    Product.find({ ...excludeMongoFilter, stock: { $gt: 0 }, status: { $ne: "deleted" } })
      .select(DISCOVER_SELECT)
      .sort({ trendingScore: -1, purchases: -1, views: -1 })
      .limit(fetchLimit)
      .lean(),

    // Pool D — New arrivals (last 30 days)
    Product.find({
      ...excludeMongoFilter,
      stock: { $gt: 0 },
      status: { $ne: "deleted" },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select(DISCOVER_SELECT)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .lean(),
  ]);

  // ── Cross-pool deduplication (priority: A > B > C > D) ────────────────────
  // Products that appear in multiple pools (e.g. a trending product also in
  // the user's category) are kept in the highest-priority pool only.
  const globalSeen = new Set(allExcludedIds);

  function dedupePool(items) {
    const out = [];
    for (const item of items) {
      const id = item._id.toString();
      if (!globalSeen.has(id)) {
        globalSeen.add(id);
        out.push(item);
      }
    }
    return out;
  }

  const poolA = tagPool(dedupePool(rawA), "personalized", null);
  const poolB = tagPool(dedupePool(rawB), "discovery", null);
  const poolC = tagPool(dedupePool(rawC), "trending", "Trending");
  const poolD = tagPool(dedupePool(rawD), "newArrival", "New");

  // ── Interleave the four pools ─────────────────────────────────────────────
  const products = interleave([
    { items: poolA, target: targets.personalized },
    { items: poolB, target: targets.discovery },
    { items: poolC, target: targets.trending },
    { items: poolD, target: targets.newArrival },
  ]);

  // ── Cursor + hasMore ──────────────────────────────────────────────────────
  // If we got fewer than the limit, the feed is exhausted.
  const hasMore = products.length >= normalizedLimit;
  const returnedIds = products.map((p) => p._id.toString());
  const nextCursor = hasMore
    ? encodeCursor([...allExcludedIds, ...returnedIds])
    : null;

  return { products, nextCursor, hasMore };
}

module.exports = { getDiscoverFeed };
