/**
 * alsoViewed.service.js
 *
 * Collaborative-filtering "Customers Also Viewed" recommendations.
 *
 * Algorithm (per spec):
 *   Step 1 — Find co-viewers: users/sessions who viewed currentProduct, then
 *             look up OTHER products they viewed within ±30 min of that view.
 *   Step 2 — Score: primary = co-view frequency; 1.5× boost if the same
 *             co-viewers also wishlisted or purchased the candidate product.
 *   Step 3 — Exclude: currentProduct, out-of-stock, already purchased by viewer.
 *   Fallback — fewer than MIN_COLLABORATIVE_RESULTS candidates → fill from the
 *              same category sorted by trendingScore.
 *   Always returns exactly RETURN_LIMIT products (filling gaps with fallback).
 */

const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const Product = require("../models/Product");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALSO_VIEWED_SELECT =
  "name price images category stock trendingScore description";
const CO_VIEW_WINDOW_MS = 30 * 60 * 1000; // ±30 minutes
const RETURN_LIMIT = 8;
const MIN_COLLABORATIVE_RESULTS = 3; // fall back if fewer co-viewed candidates
const CANDIDATE_FETCH_LIMIT = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert an array of mixed id values to an array of Mongoose ObjectIds,
 * silently dropping anything that isn't a valid ObjectId string.
 */
function toObjectIds(ids) {
  return ids
    .map(String)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Category-based fallback: top products by trendingScore in the same category.
 * If the category pool is too small it tops up from any other category.
 */
async function categoryFallback({ category, excludeOids, limit }) {
  const base = { stock: { $gt: 0 }, status: { $ne: "deleted" }, _id: { $nin: excludeOids } };

  const primary = await Product.find({ ...base, category })
    .select(ALSO_VIEWED_SELECT)
    .sort({ trendingScore: -1 })
    .limit(limit)
    .lean();

  if (primary.length >= limit) return primary.slice(0, limit);

  const remaining = limit - primary.length;
  const primaryIds = primary.map((p) => p._id);

  const topUp = await Product.find({
    ...base,
    _id: { $nin: [...excludeOids, ...primaryIds] },
    ...(category ? { category: { $ne: category } } : {}),
  })
    .select(ALSO_VIEWED_SELECT)
    .sort({ trendingScore: -1 })
    .limit(remaining)
    .lean();

  return [...primary, ...topUp];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * getAlsoViewed({ productId, userId, excludeIds })
 *
 * @param {string}   productId  — the product whose page is being viewed
 * @param {string}   userId     — authenticated viewer (null for guests)
 * @param {string[]} excludeIds — caller-supplied IDs to skip
 * @returns {{ products: Product[], coViewerCount: number }}
 */
async function getAlsoViewed({ productId, userId = null, excludeIds = [] }) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const err = new Error("Invalid product ID");
    err.statusCode = 400;
    throw err;
  }

  const productOid = new mongoose.Types.ObjectId(productId);

  // ── Build exclusion set ────────────────────────────────────────────────────
  // Always exclude the current product + any caller-supplied IDs.
  const excludeIdStrings = new Set([productId, ...excludeIds.map(String)]);

  // Also exclude products the current user has already purchased (no re-pitch).
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const purchased = await UserActivity.find({
      userId: new mongoose.Types.ObjectId(userId),
      eventType: "purchase",
    })
      .select("productId")
      .lean();
    purchased.forEach((r) => {
      if (r.productId) excludeIdStrings.add(r.productId.toString());
    });
  }

  const excludeOids = toObjectIds([...excludeIdStrings]);

  // ── Step 1: Find all view events for the current product ───────────────────
  const currentProductViews = await UserActivity.find({
    productId: productOid,
    eventType: "view",
  })
    .select("userId sessionId timestamp")
    .lean();

  // Social-proof count: unique viewers of the current product
  const coViewerCount = new Set(
    currentProductViews.map((v) =>
      v.userId ? v.userId.toString() : v.sessionId,
    ),
  ).size;

  // Fetch product category once for potential fallback use
  const currentProduct = await Product.findById(productOid)
    .select("category")
    .lean();
  const category = currentProduct?.category ?? null;

  // If no view data at all, go straight to category fallback
  if (currentProductViews.length === 0) {
    const products = await categoryFallback({
      category,
      excludeOids,
      limit: RETURN_LIMIT,
    });
    return { products, coViewerCount: 0 };
  }

  // ── Step 2: Aggregate co-viewed products via self-join ─────────────────────
  // For each view record of the current product, find other products the same
  // user/session viewed within ±30 minutes. Group by co-viewed productId and
  // collect the set of unique viewer keys (userId string || sessionId).
  const coViewAgg = await UserActivity.aggregate([
    // Only view events for the current product
    { $match: { productId: productOid, eventType: "view" } },

    // Self-join on useractivities: other views by the same user or session
    // within the ±30-minute co-view window.
    {
      $lookup: {
        from: "useractivities",
        let: {
          uid: "$userId",
          sid: "$sessionId",
          ts: "$timestamp",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$eventType", "view"] },
                  // Match same registered user (preferred) or same session
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: ["$$uid", null] },
                          { $eq: ["$userId", "$$uid"] },
                        ],
                      },
                      { $eq: ["$sessionId", "$$sid"] },
                    ],
                  },
                  // Within ±30 minutes of the anchor view
                  {
                    $gte: [
                      "$timestamp",
                      { $subtract: ["$$ts", CO_VIEW_WINDOW_MS] },
                    ],
                  },
                  {
                    $lte: [
                      "$timestamp",
                      { $add: ["$$ts", CO_VIEW_WINDOW_MS] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "coViewed",
      },
    },

    { $unwind: { path: "$coViewed", preserveNullAndEmptyArrays: false } },

    // Filter out the current product and any explicitly excluded IDs.
    // Done here (not inside $lookup) to keep the pipeline readable.
    { $match: { "coViewed.productId": { $nin: [productOid, ...excludeOids] } } },

    // Group by co-viewed productId; track unique viewer keys for dedup.
    {
      $group: {
        _id: "$coViewed.productId",
        viewerKeys: {
          $addToSet: {
            $ifNull: [{ $toString: "$userId" }, "$sessionId"],
          },
        },
      },
    },

    { $addFields: { count: { $size: "$viewerKeys" } } },
    { $sort: { count: -1 } },
    { $limit: CANDIDATE_FETCH_LIMIT },
  ]);

  // ── Sparse-data fallback ───────────────────────────────────────────────────
  if (coViewAgg.length < MIN_COLLABORATIVE_RESULTS) {
    const products = await categoryFallback({
      category,
      excludeOids,
      limit: RETURN_LIMIT,
    });
    return { products, coViewerCount };
  }

  // ── Step 3: Boost products also wishlisted/purchased by co-viewers ─────────
  const candidateProductIds = coViewAgg.map((r) => r._id);

  // Collect registered co-viewer user IDs across all candidates
  const allViewerUserIds = toObjectIds(
    [...new Set(coViewAgg.flatMap((r) => r.viewerKeys))],
  );

  const boostSignals =
    allViewerUserIds.length > 0
      ? await UserActivity.find({
          userId: { $in: allViewerUserIds },
          productId: { $in: candidateProductIds },
          eventType: { $in: ["wishlist_add", "purchase"] },
        })
          .select("productId")
          .lean()
      : [];

  const boostedIds = new Set(boostSignals.map((s) => s.productId.toString()));

  // Final score: co-view count × boost multiplier
  const scored = coViewAgg
    .map((r) => ({
      productId: r._id,
      score: r.count * (boostedIds.has(r._id.toString()) ? 1.5 : 1),
    }))
    .sort((a, b) => b.score - a.score);

  // ── Fetch product details in score order ───────────────────────────────────
  const topIds = scored.map((r) => r.productId);
  const productDocs = await Product.find({
    _id: { $in: topIds },
    stock: { $gt: 0 },
    status: { $ne: "deleted" },
  })
    .select(ALSO_VIEWED_SELECT)
    .lean();

  const productMap = new Map(productDocs.map((p) => [p._id.toString(), p]));
  const ordered = topIds
    .map((id) => productMap.get(id.toString()))
    .filter(Boolean)
    .slice(0, RETURN_LIMIT);

  // ── Fill gaps with category fallback if needed ─────────────────────────────
  if (ordered.length < RETURN_LIMIT) {
    const gapExclude = [
      ...excludeOids,
      ...toObjectIds(ordered.map((p) => p._id.toString())),
    ];
    const filler = await categoryFallback({
      category,
      excludeOids: gapExclude,
      limit: RETURN_LIMIT - ordered.length,
    });
    return { products: [...ordered, ...filler], coViewerCount };
  }

  return { products: ordered, coViewerCount };
}

module.exports = { getAlsoViewed };
