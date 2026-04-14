const express = require("express");
const router = express.Router();
const { protect, optionalProtect } = require("../middleware/auth.middleware");
const {
  getTrendingWithRanks,
  getTopPicksForUser,
  getDiscoverFeed,
  getAlsoViewed,
  getCheckoutUpsell,
} = require("../controllers/recommendation.controller");

// GET /api/recommendations/trending
// Returns the top 20 products ranked by trendingScore with badge metadata.
// No auth required — trending is a global signal, not personalized.
router.get("/trending", getTrendingWithRanks);

// GET /api/recommendations/for-you
// Personalized top-12 picks for the authenticated user.
// userId is derived from the JWT — not in the URL — to prevent users
// requesting each other's personalized picks.
// ?exclude=id1,id2,... — caller-supplied IDs to skip (e.g. Trending Now items)
router.get("/for-you", protect, getTopPicksForUser);

// GET /api/recommendations/discover?cursor=<token>&limit=12&exclude=id1,id2,...
// Hybrid paginated feed. optionalProtect so guests get a personalisation-free
// version while authenticated users get the full taste-profile-aware mix.
router.get("/discover", optionalProtect, getDiscoverFeed);

// GET /api/recommendations/also-viewed/:productId
// Collaborative-filtering "Customers Also Viewed" for the product detail page.
// optionalProtect: authenticated users get their purchased products excluded.
router.get("/also-viewed/:productId", optionalProtect, getAlsoViewed);

// GET /api/recommendations/checkout-upsell?cartProductIds=id1,id2,...
// Smart pre-checkout upsell (P1 wishlist / P2 repeat views / P3 complements / P4 trending).
// Requires auth — userId comes from JWT, not the URL.
router.get("/checkout-upsell", protect, getCheckoutUpsell);

module.exports = router;
