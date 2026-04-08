const express = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

router.get(
  "/admin/dashboard/metrics",
  protect,
  authorize(["admin"]),
  adminController.getDashboardMetrics,
);

module.exports = router;
