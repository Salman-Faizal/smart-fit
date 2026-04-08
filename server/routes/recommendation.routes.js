const express = require("express");
const router = express.Router();
const { optionalProtect } = require("../middleware/auth.middleware");
const recommendationController = require("../controllers/recommendation.controller");

router.get(
  "/recommendations/trending",
  recommendationController.getTrendingRecommendations,
);
router.get(
  "/recommendations/also-viewed/:productId",
  optionalProtect,
  recommendationController.getHybridAlsoViewedRecommendations,
);
router.get(
  "/:productId/recommendations",
  optionalProtect,
  recommendationController.getProductRecommendations,
);

module.exports = router;
