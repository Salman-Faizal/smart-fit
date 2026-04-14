const Product = require("../models/Product");
const ProductInteraction = require("../models/ProductInteraction");

// Event weights for trending score formula
const EVENT_WEIGHTS = {
  view: 1,
  wishlist: 3,
  cart: 4,
  purchase: 6,
  recommendation_click: 0.5,
};

// Time-decay multipliers for each bucket
const DECAY = {
  last24h: 1.0, // interactions in the last 24 hours count full
  last7d: 0.6,  // 1–7 days ago count 60%
  last30d: 0.3, // 7–30 days ago count 30%
};

/**
 * Aggregates ProductInteraction records for a given time window into a scoreMap.
 * mutates scoreMap in-place: { [productId]: number }
 */
function applyBucket(rows, decay, scoreMap) {
  for (const row of rows) {
    const pid = row._id.productId.toString();
    const weight = EVENT_WEIGHTS[row._id.eventType] ?? 0;
    scoreMap[pid] = (scoreMap[pid] ?? 0) + weight * decay * row.count;
  }
}

/**
 * Recalculates trendingScore, viewCount, purchaseCount, and wishlistCount
 * for every product that has at least one recorded interaction.
 *
 * trendingScore formula (time-decayed, last 30 days):
 *   Σ (eventWeight × decayFactor × count)
 *   where decay = 1.0 (< 24h) | 0.6 (< 7d) | 0.3 (< 30d)
 *
 * Counts (all-time, from ProductInteraction):
 *   viewCount      = total "view" interactions ever
 *   purchaseCount  = total "purchase" interactions ever
 *   wishlistCount  = total "wishlist" interactions ever
 *
 * @returns {{ updated: number, ranAt: Date }}
 */
async function updateTrendingScores() {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Run all three time-bucket aggregations + all-time counts in parallel
  const [last24h, last7d, last30d, allTimeCounts] = await Promise.all([
    // Last 24 hours
    ProductInteraction.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: { productId: "$productId", eventType: "$eventType" },
          count: { $sum: 1 },
        },
      },
    ]),

    // 1–7 days ago
    ProductInteraction.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo, $lt: oneDayAgo } } },
      {
        $group: {
          _id: { productId: "$productId", eventType: "$eventType" },
          count: { $sum: 1 },
        },
      },
    ]),

    // 7–30 days ago
    ProductInteraction.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo, $lt: sevenDaysAgo } } },
      {
        $group: {
          _id: { productId: "$productId", eventType: "$eventType" },
          count: { $sum: 1 },
        },
      },
    ]),

    // All-time counts per product per event type (no time filter)
    ProductInteraction.aggregate([
      {
        $group: {
          _id: { productId: "$productId", eventType: "$eventType" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Build time-decayed trending score map
  const scoreMap = {};
  applyBucket(last24h, DECAY.last24h, scoreMap);
  applyBucket(last7d, DECAY.last7d, scoreMap);
  applyBucket(last30d, DECAY.last30d, scoreMap);

  // Build all-time count maps
  const viewCountMap = {};
  const purchaseCountMap = {};
  const wishlistCountMap = {};

  for (const row of allTimeCounts) {
    const pid = row._id.productId.toString();
    if (row._id.eventType === "view") viewCountMap[pid] = row.count;
    if (row._id.eventType === "purchase") purchaseCountMap[pid] = row.count;
    if (row._id.eventType === "wishlist") wishlistCountMap[pid] = row.count;
  }

  // Union all product IDs seen across any dataset
  const allProductIds = new Set([
    ...Object.keys(scoreMap),
    ...Object.keys(viewCountMap),
    ...Object.keys(purchaseCountMap),
    ...Object.keys(wishlistCountMap),
  ]);

  if (allProductIds.size === 0) {
    return { updated: 0, ranAt: now };
  }

  // Build bulk write operations
  const bulkOps = Array.from(allProductIds).map((pid) => ({
    updateOne: {
      filter: { _id: pid },
      update: {
        $set: {
          trendingScore: parseFloat(((scoreMap[pid] ?? 0)).toFixed(4)),
          viewCount: viewCountMap[pid] ?? 0,
          purchaseCount: purchaseCountMap[pid] ?? 0,
          wishlistCount: wishlistCountMap[pid] ?? 0,
        },
      },
    },
  }));

  await Product.bulkWrite(bulkOps, { ordered: false });

  return { updated: bulkOps.length, ranAt: now };
}

module.exports = { updateTrendingScores };
