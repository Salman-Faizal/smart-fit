const adminService = require("../services/admin.service");
const { updateTrendingScores } = require("../services/trending.service");
const { buildSearchIndex } = require("../services/searchIndex.service");
const { updateOrderStatus } = require("../services/order.service");
const { destroyCloudinaryAsset } = require("../utils/cloudinaryAsset");
const User = require("../models/User");
const { sendEmail, orderConfirmationEmail, orderRejectionEmail } = require("../services/email.service");

const handleError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({ message: error.message || "An error occurred" });
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────

exports.getDashboardMetrics = async (req, res) => {
  try {
    const range = Math.max(Number(req.query.range) || 7, 1);
    const categoryLimit = Math.max(Number(req.query.categoryLimit) || 5, 1);
    const trendingLimit = Math.max(Number(req.query.trendingLimit) || 5, 1);
    const metrics = await adminService.getDashboardMetrics({ range, categoryLimit, trendingLimit });
    return res.status(200).json(metrics);
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Trending / Cache ──────────────────────────────────────────────────────────

exports.recalculateTrending = async (req, res) => {
  try {
    const result = await updateTrendingScores();
    return res.status(200).json({ message: "Trending scores recalculated successfully", updated: result.updated, ranAt: result.ranAt });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.clearCache = async (_req, res) => {
  try {
    return res.status(200).json({ message: "Recommendation cache cleared successfully" });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Orders ────────────────────────────────────────────────────────────────────

exports.getOrders = async (req, res) => {
  try {
    const { page, limit, status, paymentStatus, paymentMethod, search, dateFrom, dateTo } = req.query;
    const result = await adminService.getAdminOrders({ page, limit: Math.min(Number(limit) || 20, 100), status, paymentStatus, paymentMethod, search, dateFrom, dateTo });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await adminService.getAdminOrderById(req.params.id);
    return res.status(200).json({ order });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatus(req.params.id, status);
    return res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getPendingBankOrders = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const result = await adminService.getPendingBankOrders({ page, limit: Math.min(Number(limit) || 20, 100), search });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.approveBankPayment = async (req, res) => {
  try {
    const order = await adminService.approveBankPayment(req.params.id);

    const userDoc = order.user;
    const userEmail = userDoc?.email;
    const userName = userDoc?.name || "Customer";
    if (userEmail) {
      sendEmail(
        userEmail,
        `Order Confirmed — #${String(order._id).slice(-8).toUpperCase()} 🎉`,
        orderConfirmationEmail(userName, order),
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Payment approved", order });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.rejectBankPayment = async (req, res) => {
  try {
    const order = await adminService.rejectBankPayment(req.params.id);

    const user = await User.findById(order.user).select("name email");
    if (user) {
      sendEmail(
        user.email,
        `Update on your Smart Fit order #${String(order._id).slice(-8).toUpperCase()}`,
        orderRejectionEmail(user.name, order),
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Payment rejected", order });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Customers ─────────────────────────────────────────────────────────────────

exports.getCustomers = async (req, res) => {
  try {
    const { page, limit, search, status, hasOrders } = req.query;
    const result = await adminService.getAdminCustomers({ page, limit: Math.min(Number(limit) || 20, 100), search, status, hasOrders });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await adminService.getAdminCustomerById(req.params.id);
    return res.status(200).json({ customer });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.toggleCustomerBan = async (req, res) => {
  try {
    const { isBanned } = req.body;
    const result = await adminService.toggleCustomerBan(req.params.id, isBanned);
    return res.status(200).json({ message: isBanned ? "Customer banned" : "Customer unbanned", ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Admin Profile ─────────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  try {
    const profile = await adminService.getAdminProfile(req.user.id);
    return res.status(200).json({ profile });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const profile = await adminService.updateAdminProfile(req.user.id, { name, phone });
    return res.status(200).json({ message: "Profile updated", profile });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    await adminService.changeAdminPassword(req.user.id, req.body);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const admin = await User.findOne({ _id: req.user.id, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const oldPublicId = admin.avatar?.publicId;
    admin.avatar = { url: req.file.path || req.file.secure_url, publicId: req.file.filename || req.file.public_id };
    await admin.save();

    if (oldPublicId) await destroyCloudinaryAsset(oldPublicId, "image").catch(() => {});

    return res.status(200).json({ message: "Avatar updated", avatar: admin.avatar });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Settings ──────────────────────────────────────────────────────────────────

exports.getSettings = async (_req, res) => {
  try {
    const settings = await adminService.getAllSettings();
    return res.status(200).json({ settings });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await adminService.updateSettings(req.body);
    return res.status(200).json({ message: "Settings updated", settings });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Categories ────────────────────────────────────────────────────────────────

exports.getCategories = async (_req, res) => {
  try {
    const categories = await adminService.getCategories();
    return res.status(200).json({ categories });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await adminService.createCategory(req.body.name);
    return res.status(201).json({ message: "Category created", category });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await adminService.updateCategory(req.params.id, req.body.name);
    return res.status(200).json({ message: "Category updated", category });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await adminService.deleteCategory(req.params.id);
    return res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Products (admin) ──────────────────────────────────────────────────────────

exports.getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, stockStatus, status, priceMin, priceMax, sortBy, sortDir } = req.query;
    const result = await adminService.getAdminProducts({ page, limit: Math.min(Number(limit) || 20, 100), search, category, stockStatus, status, priceMin, priceMax, sortBy, sortDir });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const product = await adminService.updateProductStatus(req.params.id, req.body.status);
    buildSearchIndex().catch(() => {});
    return res.status(200).json({ message: "Product status updated", product });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    const result = await adminService.bulkCreateProducts(req.body.products);
    buildSearchIndex().catch(() => {});
    return res.status(200).json({ message: "Bulk import complete", ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.softDeleteProduct = async (req, res) => {
  try {
    await adminService.softDeleteProduct(req.params.id);
    buildSearchIndex().catch(() => {});
    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Dashboard v2 ─────────────────────────────────────────────────────────────

exports.getWeeklyStats = async (_req, res) => {
  try {
    const data = await adminService.getWeeklyStats();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getRevenueChart = async (req, res) => {
  try {
    const { range, dateFrom, dateTo } = req.query;
    const data = await adminService.getRevenueChartData({ range, dateFrom, dateTo });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getTopCategoriesDonut = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 12);
    const data = await adminService.getTopCategoriesDonut(limit);
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getMonthlyTarget = async (_req, res) => {
  try {
    const data = await adminService.getMonthlyTargetData();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getConversionFunnel = async (_req, res) => {
  try {
    const data = await adminService.getConversionFunnelData();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getTopProductsDashboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const data = await adminService.getTopProductsDashboard(limit);
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getLowStockDashboard = async (_req, res) => {
  try {
    const data = await adminService.getLowStockDashboard();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

// ─── Reports ───────────────────────────────────────────────────────────────────

const parseCategories = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
};

exports.getReportSalesSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays, categories } = req.query;
    const data = await adminService.getReportSalesSummary({ dateFrom, dateTo, rangeDays, categories: parseCategories(categories) });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportRevenueBreakdown = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays, categories } = req.query;
    const data = await adminService.getReportRevenueBreakdown({ dateFrom, dateTo, rangeDays, categories: parseCategories(categories) });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportTopProducts = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays, categories, limit } = req.query;
    const data = await adminService.getReportTopProducts({ dateFrom, dateTo, rangeDays, categories: parseCategories(categories), limit });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportCategoryPerformance = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays } = req.query;
    const data = await adminService.getReportCategoryPerformance({ dateFrom, dateTo, rangeDays });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportOrderStatusBreakdown = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays } = req.query;
    const data = await adminService.getReportOrderStatusBreakdown({ dateFrom, dateTo, rangeDays });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportCustomerInsights = async (req, res) => {
  try {
    const { dateFrom, dateTo, rangeDays } = req.query;
    const data = await adminService.getReportCustomerInsights({ dateFrom, dateTo, rangeDays });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReportLowStockSnapshot = async (_req, res) => {
  try {
    const data = await adminService.getReportLowStockSnapshot();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};
