const adminService = require("../services/admin.service");

exports.getDashboardMetrics = async (req, res) => {
  try {
    const range = Math.max(Number(req.query.range) || 7, 1);
    const categoryLimit = Math.max(Number(req.query.categoryLimit) || 5, 1);
    const trendingLimit = Math.max(Number(req.query.trendingLimit) || 5, 1);
    const threshold = Math.max(Number(req.query.threshold) || 5, 1);

    const metrics = await adminService.getDashboardMetrics({
      range,
      categoryLimit,
      trendingLimit,
      threshold,
    });

    return res.status(200).json(metrics);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch admin dashboard metrics",
    });
  }
};
