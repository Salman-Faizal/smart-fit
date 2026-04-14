const express = require("express");
const router = express.Router();
const {
  getTrendingWithRanks,
} = require("../controllers/recommendation.controller");

// GET /api/recommendations/trending
// Returns the top 20 products ranked by trendingScore with badge metadata.
// No auth required — trending is a global signal, not personalized.
router.get("/trending", getTrendingWithRanks);

module.exports = router;
