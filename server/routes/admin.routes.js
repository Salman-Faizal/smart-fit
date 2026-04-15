const express = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");
const { runUpload, uploadAvatar } = require("../middleware/upload.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

const admin = [protect, authorize(["admin"])];

// Dashboard
router.get("/admin/dashboard/metrics", ...admin, adminController.getDashboardMetrics);
router.get("/admin/dashboard/weekly-stats", ...admin, adminController.getWeeklyStats);
router.get("/admin/dashboard/revenue-chart", ...admin, adminController.getRevenueChart);
router.get("/admin/dashboard/top-categories-donut", ...admin, adminController.getTopCategoriesDonut);
router.get("/admin/dashboard/monthly-target", ...admin, adminController.getMonthlyTarget);
router.get("/admin/dashboard/conversion-funnel", ...admin, adminController.getConversionFunnel);
router.get("/admin/dashboard/top-products", ...admin, adminController.getTopProductsDashboard);
router.get("/admin/dashboard/low-stock", ...admin, adminController.getLowStockDashboard);

// Utilities
router.post("/admin/recalculate-trending", ...admin, adminController.recalculateTrending);
router.post("/admin/clear-cache", ...admin, adminController.clearCache);

// Orders
router.get("/admin/orders", ...admin, adminController.getOrders);
router.get("/admin/orders/pending-bank", ...admin, adminController.getPendingBankOrders);
router.get("/admin/orders/:id", ...admin, adminController.getOrderById);
router.put("/admin/orders/:id/status", ...admin, adminController.updateOrderStatus);
router.put("/admin/orders/:id/approve-bank", ...admin, adminController.approveBankPayment);
router.put("/admin/orders/:id/reject-bank", ...admin, adminController.rejectBankPayment);

// Customers
router.get("/admin/customers", ...admin, adminController.getCustomers);
router.get("/admin/customers/:id", ...admin, adminController.getCustomerById);
router.put("/admin/customers/:id/ban", ...admin, adminController.toggleCustomerBan);

// Admin Profile
router.get("/admin/profile", ...admin, adminController.getProfile);
router.put("/admin/profile", ...admin, adminController.updateProfile);
router.post("/admin/profile/change-password", ...admin, adminController.changePassword);
router.post("/admin/profile/avatar", ...admin, runUpload(uploadAvatar), adminController.uploadAvatar);

// Settings
router.get("/admin/settings", ...admin, adminController.getSettings);
router.put("/admin/settings", ...admin, adminController.updateSettings);

// Categories
router.get("/admin/categories", ...admin, adminController.getCategories);
router.post("/admin/categories", ...admin, adminController.createCategory);
router.put("/admin/categories/:id", ...admin, adminController.updateCategory);
router.delete("/admin/categories/:id", ...admin, adminController.deleteCategory);

// Products (admin paginated)
router.get("/admin/products", ...admin, adminController.getProducts);
router.post("/admin/products/bulk", ...admin, adminController.bulkCreateProducts);
router.delete("/admin/products/:id", ...admin, adminController.softDeleteProduct);

// Reports
router.get("/admin/reports/sales-summary", ...admin, adminController.getReportSalesSummary);
router.get("/admin/reports/revenue-breakdown", ...admin, adminController.getReportRevenueBreakdown);
router.get("/admin/reports/top-products", ...admin, adminController.getReportTopProducts);
router.get("/admin/reports/category-performance", ...admin, adminController.getReportCategoryPerformance);
router.get("/admin/reports/order-status", ...admin, adminController.getReportOrderStatusBreakdown);
router.get("/admin/reports/customer-insights", ...admin, adminController.getReportCustomerInsights);
router.get("/admin/reports/low-stock-snapshot", ...admin, adminController.getReportLowStockSnapshot);

module.exports = router;
