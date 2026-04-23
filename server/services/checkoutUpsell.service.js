/**
 * checkoutUpsell.service.js
 *
 * "Before You Go" smart upsell for Step 1 of checkout.
 *
 * Candidate pool — filled in priority order, capped at 6 total:
 *   P1 — Wishlisted but NOT in cart (highest intent signal)
 *   P2 — Products viewed 2+ times in the last 7 days (repeated interest)
 *   P3 — Category complements to cart items (outfit logic)
 *   P4 — Top trending filler if fewer than 4 candidates found
 *
 * Within each tier, items are sorted by trendingScore descending.
 * Products already in cart or previously purchased are always excluded.
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const UserActivity = require("../models/UserActivity");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPSELL_SELECT = "name price images category stock trendingScore";
const MAX_RESULTS = 6;
const MIN_BEFORE_FLASH_FILL = 4;
const REPEAT_VIEW_DAYS = 7;
const REPEAT_VIEW_MIN_COUNT = 2;

/**
 * Menswear complement map: for each keyword that might appear in a category
 * name, which sibling keywords are "outfit-compatible" complements.
 * Matching is done by case-insensitive substring on DB category strings.
 */
const COMPLEMENT_MAP = {
  trouser: ["shirt", "belt", "shoe", "jacket", "blazer", "t-shirt"],
  pant: ["shirt", "belt", "shoe", "jacket", "t-shirt"],
  jean: ["shirt", "jacket", "belt", "shoe", "t-shirt"],
  short: ["t-shirt", "shirt", "shoe", "sock"],
  shirt: ["trouser", "pant", "jean", "jacket", "blazer", "belt"],
  "t-shirt": ["trouser", "pant", "jean", "short", "jacket"],
  jacket: ["shirt", "t-shirt", "trouser", "jean", "pant"],
  blazer: ["shirt", "trouser", "pant", "belt", "tie"],
  suit: ["shirt", "shoe", "belt", "tie", "accessory"],
  shoe: ["trouser", "jean", "short", "sock", "pant"],
  belt: ["trouser", "jean", "pant", "short"],
  tie: ["shirt", "suit", "blazer"],
  accessory: ["shirt", "suit", "jacket", "blazer"],
  sock: ["shoe", "trouser", "short"],
  sweater: ["trouser", "pant", "jean"],
  hoodie: ["trouser", "pant", "jean", "short"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toObjectIds(ids) {
  return ids
    .map(String)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Given a set of cart category names, return the set of DB category names that
 * are outfit complements. Matching is bidirectional and case-insensitive substring.
 */
async function resolveComplementCategories(cartCategories, excludeCategorySet) {
  // Collect complement keywords based on cart categories
  const complementKeywords = new Set();
  for (const cat of cartCategories) {
    const lower = cat.toLowerCase();
    for (const [keyword, complements] of Object.entries(COMPLEMENT_MAP)) {
      if (lower.includes(keyword)) {
        complements.forEach((c) => complementKeywords.add(c));
      }
    }
  }
  if (complementKeywords.size === 0) return [];

  // Fetch all distinct categories from DB and filter by keyword match
  const allCategories = await Product.distinct("category", {
    stock: { $gt: 0 },
    status: { $ne: "deleted" },
  });

  return allCategories.filter((dbCat) => {
    if (excludeCategorySet.has(dbCat)) return false; // don't suggest cart categories
    const lower = dbCat.toLowerCase();
    return [...complementKeywords].some(
      (kw) => lower.includes(kw) || kw.includes(lower),
    );
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * getCheckoutUpsell({ userId, cartProductIds })
 *
 * @param {string}   userId         — authenticated user's ObjectId string
 * @param {string[]} cartProductIds — product IDs currently in the cart
 * @returns {{ products: Product[], hasWishlistItems: boolean }}
 */
async function getCheckoutUpsell({ userId, cartProductIds = [] }) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("Authenticated user required");
    err.statusCode = 401;
    throw err;
  }

  const userOid = new mongoose.Types.ObjectId(userId);

  // ── Build exclusion set ────────────────────────────────────────────────────
  // Exclude everything currently in cart
  const cartIdStrings = new Set(
    cartProductIds.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id)),
  );

  // Also exclude anything the user has previously purchased (UserActivity)
  const purchasedRecords = await UserActivity.find({
    userId: userOid,
    eventType: "purchase",
  })
    .select("productId")
    .lean();
  const purchasedIds = purchasedRecords
    .map((r) => r.productId?.toString())
    .filter(Boolean);

  const excludeIdStrings = new Set([...cartIdStrings, ...purchasedIds]);

  // ── Accumulated result (preserves tier order for priority dedup) ───────────
  const results = []; // { ...product, _tier }
  const seenIds = new Set();

  function addProducts(products, tier) {
    for (const p of products) {
      const id = p._id.toString();
      if (!seenIds.has(id) && results.length < MAX_RESULTS) {
        seenIds.add(id);
        results.push({ ...p, _tier: tier });
      }
    }
  }

  // ── Priority 1: Wishlisted but not in cart ─────────────────────────────────
  const userDoc = await User.findById(userOid)
    .select("wishlist")
    .populate({
      path: "wishlist.product",
      select: UPSELL_SELECT,
    })
    .lean();

  const wishlistItems = (userDoc?.wishlist || [])
    .map((w) => w.product)
    .filter(
      (p) =>
        p &&
        p.status !== "deleted" &&
        Number(p.stock) > 0 &&
        !excludeIdStrings.has(p._id.toString()),
    )
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));

  addProducts(wishlistItems, 1);

  // ── Priority 2: Viewed 2+ times in last 7 days ────────────────────────────
  const sevenDaysAgo = new Date(
    Date.now() - REPEAT_VIEW_DAYS * 24 * 60 * 60 * 1000,
  );

  const excludeOidsForAgg = toObjectIds([...excludeIdStrings]);

  const repeatViews = await UserActivity.aggregate([
    {
      $match: {
        userId: userOid,
        eventType: "view",
        timestamp: { $gte: sevenDaysAgo },
        ...(excludeOidsForAgg.length
          ? { productId: { $nin: excludeOidsForAgg } }
          : {}),
      },
    },
    { $group: { _id: "$productId", count: { $sum: 1 } } },
    { $match: { count: { $gte: REPEAT_VIEW_MIN_COUNT } } },
    { $sort: { count: -1 } },
    { $limit: MAX_RESULTS * 2 },
  ]);

  if (repeatViews.length > 0) {
    const repeatViewIds = repeatViews.map((r) => r._id);
    const repeatViewProducts = await Product.find({
      _id: { $in: repeatViewIds },
      stock: { $gt: 0 },
      status: { $ne: "deleted" },
    })
      .select(UPSELL_SELECT)
      .lean();

    // Preserve aggregation order (most-viewed first), then sort by trendingScore within same count
    const viewCountMap = new Map(
      repeatViews.map((r) => [r._id.toString(), r.count]),
    );
    repeatViewProducts.sort((a, b) => {
      const countDiff =
        (viewCountMap.get(b._id.toString()) || 0) -
        (viewCountMap.get(a._id.toString()) || 0);
      return countDiff !== 0
        ? countDiff
        : (b.trendingScore || 0) - (a.trendingScore || 0);
    });

    addProducts(
      repeatViewProducts.filter((p) => !seenIds.has(p._id.toString())),
      2,
    );
  }

  // ── Priority 3: Category complements ──────────────────────────────────────
  if (results.length < MAX_RESULTS) {
    // Get cart product categories for complement resolution
    const cartProductDocs = await Product.find({
      _id: { $in: toObjectIds([...cartIdStrings]) },
    })
      .select("category")
      .lean();
    const cartCategories = [...new Set(cartProductDocs.map((p) => p.category))];
    const cartCategorySet = new Set(cartCategories);

    const complementCategoryNames = await resolveComplementCategories(
      cartCategories,
      cartCategorySet,
    );

    if (complementCategoryNames.length > 0) {
      const alreadySeenOids = toObjectIds([...seenIds, ...excludeIdStrings]);
      const complementProducts = await Product.find({
        stock: { $gt: 0 },
        status: { $ne: "deleted" },
        category: { $in: complementCategoryNames },
        _id: { $nin: alreadySeenOids },
      })
        .select(UPSELL_SELECT)
        .sort({ trendingScore: -1 })
        .limit(MAX_RESULTS)
        .lean();

      addProducts(complementProducts, 3);
    }
  }

  // ── Priority 4: Trending flash fill ───────────────────────────────────────
  if (results.length < MIN_BEFORE_FLASH_FILL) {
    const flashExcludeOids = toObjectIds([...seenIds, ...excludeIdStrings]);
    const trending = await Product.find({
      stock: { $gt: 0 },
      status: { $ne: "deleted" },
      ...(flashExcludeOids.length
        ? { _id: { $nin: flashExcludeOids } }
        : {}),
    })
      .select(UPSELL_SELECT)
      .sort({ trendingScore: -1 })
      .limit(MAX_RESULTS - results.length)
      .lean();

    addProducts(trending, 4);
  }

  const hasWishlistItems = results.some((p) => p._tier === 1);

  return {
    products: results.slice(0, MAX_RESULTS),
    hasWishlistItems,
  };
}

module.exports = { getCheckoutUpsell };
