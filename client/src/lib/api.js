import { storage } from "./storage";

const DEFAULT_API_BASE_URL = "https://smart-fit-cnax.onrender.com";
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const normalizeApiBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

export const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);
export const API = `${API_BASE_URL}/api`;

export const assetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};

const notifyCartChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart:changed"));
  }
};

const request = async (path, options = {}) => {
  const token = storage.getToken();

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const endpoint = `${API}${path}`;
  const response = await fetch(endpoint, { ...options, headers });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detailedMessage =
      data.message || data.error || data.details || "Request failed";
    const error = new Error(detailedMessage);
    error.status = response.status;
    error.payload = data;
    error.endpoint = endpoint;
    if (import.meta.env.DEV) {
      console.error("[API] request failed", {
        endpoint,
        status: response.status,
        payload: data,
      });
    }
    throw error;
  }

  return data;
};

export const api = {
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getProfile: () => request("/users/profile"),
  uploadAvatar: (formData) =>
    request("/users/me/avatar", {
      method: "POST",
      body: formData,
    }),
  uploadPaymentSlip: (orderId, formData) =>
    request(`/payments/orders/${orderId}/slip`, {
      method: "POST",
      body: formData,
    }),
  getPaymentSlip: (orderId) => request(`/payments/orders/${orderId}/slip`),
  getCart: () => request("/orders/cart"),
  addToCart: async (payload) => {
    const data = await request("/orders/cart", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    notifyCartChanged();
    return data;
  },
  updateCartItem: async (itemId, quantity) => {
    const data = await request(`/orders/cart/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    notifyCartChanged();
    return data;
  },
  removeCartItem: async (itemId) => {
    const data = await request(`/orders/cart/${itemId}`, {
      method: "DELETE",
    });
    notifyCartChanged();
    return data;
  },
  checkoutOrder: async (paymentMethod) => {
    const data = await request("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    });
    notifyCartChanged();
    return data;
  },
  getMyOrders: () => request("/orders/my"),
  getOrderById: (orderId) => request(`/orders/${orderId}`),
  markOrderPaid: (orderId) =>
    request(`/orders/${orderId}/mark-paid`, { method: "PATCH" }),
  createStripeCheckoutSession: (orderId) =>
    request(`/payments/orders/${orderId}/stripe-checkout-session`, {
      method: "POST",
    }),
  cancelStripeOrder: (orderId) =>
    request(`/payments/orders/${orderId}/cancel`, {
      method: "POST",
    }),
  confirmStripeOrderPaid: (orderId) =>
    request(`/payments/orders/${orderId}/confirm-paid`, {
      method: "POST",
    }),
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(`/products${queryString ? `?${queryString}` : ""}`);
  },
  getProductById: (id) => request(`/products/${id}`),
  getProductRecommendations: (id) => request(`/products/${id}/recommendations`),
  getAlsoViewedRecommendations: (id) =>
    request(`/products/recommendations/also-viewed/${id}`),
  getTrendingRecommendations: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/products/recommendations/trending${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Ranked trending — top 20 with rank and badge metadata, for the home page
  getTrendingWithRanks: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/recommendations/trending${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Personalized top-12 picks — requires auth (userId from JWT server-side)
  getTopPicksForUser: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/recommendations/for-you${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Smart pre-checkout upsell — P1 wishlist / P2 repeat-views / P3 complements / P4 trending
  getCheckoutUpsell: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/recommendations/checkout-upsell${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Collaborative-filtering "Customers Also Viewed" for the product detail page
  getAlsoViewed: (productId, params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/recommendations/also-viewed/${productId}${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Hybrid paginated discover feed — cursor-based, works for guests too
  getDiscoverFeed: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/recommendations/discover${queryString ? `?${queryString}` : ""}`,
    );
  },
  getForYouRecommendations: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/products/recommendations/for-you${queryString ? `?${queryString}` : ""}`,
    );
  },
  getDiscoverRecommendations: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/products/recommendations/discover${queryString ? `?${queryString}` : ""}`,
    );
  },
  getRecentlyViewed: () => request("/users/me/recently-viewed"),
  toggleWishlist: (productId) =>
    request(`/users/me/wishlist/${productId}`, { method: "POST" }),
  createProduct: (formData) =>
    request("/products", {
      method: "POST",
      body: formData,
    }),
  updateProduct: (id, formData) =>
    request(`/products/${id}`, {
      method: "PUT",
      body: formData,
    }),
  deleteProduct: (id) =>
    request(`/products/${id}`, {
      method: "DELETE",
    }),
  getAdminDashboardMetrics: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(
      `/admin/dashboard/metrics${queryString ? `?${queryString}` : ""}`,
    );
  },
  // Admin Orders
  getAdminOrders: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/orders?${query.toString()}`);
  },
  getAdminOrderById: (id) => request(`/admin/orders/${id}`),
  updateAdminOrderStatus: (id, status) =>
    request(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  getAdminPendingBankOrders: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/orders/pending-bank?${query.toString()}`);
  },
  approveBankPayment: (id) =>
    request(`/admin/orders/${id}/approve-bank`, { method: "PUT" }),
  rejectBankPayment: (id) =>
    request(`/admin/orders/${id}/reject-bank`, { method: "PUT" }),
  // Admin Customers
  getAdminCustomers: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/customers?${query.toString()}`);
  },
  getAdminCustomerById: (id) => request(`/admin/customers/${id}`),
  toggleCustomerBan: (id, isBanned) =>
    request(`/admin/customers/${id}/ban`, {
      method: "PUT",
      body: JSON.stringify({ isBanned }),
    }),
  // Admin Profile
  getAdminProfile: () => request("/admin/profile"),
  updateAdminProfile: (payload) =>
    request("/admin/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  changeAdminPassword: (payload) =>
    request("/admin/profile/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  uploadAdminAvatar: (formData) =>
    request("/admin/profile/avatar", {
      method: "POST",
      body: formData,
    }),
  // Admin Settings
  getAdminSettings: () => request("/admin/settings"),
  updateAdminSettings: (payload) =>
    request("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  // Admin Categories
  getAdminCategories: () => request("/admin/categories"),
  createAdminCategory: (name) =>
    request("/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAdminCategory: (id, name) =>
    request(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  deleteAdminCategory: (id) =>
    request(`/admin/categories/${id}`, { method: "DELETE" }),
  // Admin Products (paginated)
  getAdminProducts: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/products?${query.toString()}`);
  },
  adminSoftDeleteProduct: (id) =>
    request(`/admin/products/${id}`, { method: "DELETE" }),
  updateProductStatus: (id, status) =>
    request(`/admin/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  bulkCreateProducts: (products) =>
    request("/admin/products/bulk", {
      method: "POST",
      body: JSON.stringify({ products }),
    }),
  // Admin Utilities
  recalculateTrending: () =>
    request("/admin/recalculate-trending", { method: "POST" }),
  clearRecommendationCache: () =>
    request("/admin/clear-cache", { method: "POST" }),
  // Dashboard v2 cards
  getDashboardWeeklyStats: () => request("/admin/dashboard/weekly-stats"),
  getDashboardRevenueChart: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/dashboard/revenue-chart?${query.toString()}`);
  },
  getDashboardTopCategoriesDonut: (limit = 8) =>
    request(`/admin/dashboard/top-categories-donut?limit=${limit}`),
  getDashboardMonthlyTarget: () => request("/admin/dashboard/monthly-target"),
  getDashboardConversionFunnel: () => request("/admin/dashboard/conversion-funnel"),
  getDashboardTopProducts: (limit = 5) =>
    request(`/admin/dashboard/top-products?limit=${limit}`),
  getDashboardLowStock: () => request("/admin/dashboard/low-stock"),
  // Reports
  getReportSalesSummary: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/sales-summary?${query.toString()}`);
  },
  getReportRevenueBreakdown: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/revenue-breakdown?${query.toString()}`);
  },
  getReportTopProducts: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/top-products?${query.toString()}`);
  },
  getReportCategoryPerformance: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/category-performance?${query.toString()}`);
  },
  getReportOrderStatus: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/order-status?${query.toString()}`);
  },
  getReportCustomerInsights: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/admin/reports/customer-insights?${query.toString()}`);
  },
  getReportLowStockSnapshot: () => request("/admin/reports/low-stock-snapshot"),
  // Style Quiz
  submitStyleQuiz: (payload) =>
    request("/recommendations/quiz", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Wishlist
  getWishlist: () => request("/users/me/wishlist"),
  // Profile update
  updateProfile: (payload) =>
    request("/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  // Addresses
  getAddresses: () => request("/users/me/addresses"),
  addAddress: (payload) =>
    request("/users/me/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAddress: (addressId, payload) =>
    request(`/users/me/addresses/${addressId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteAddress: (addressId) =>
    request(`/users/me/addresses/${addressId}`, {
      method: "DELETE",
    }),
  setDefaultAddress: (addressId) =>
    request(`/users/me/addresses/${addressId}/default`, {
      method: "PUT",
    }),
  // Password change
  changePassword: (payload) =>
    request("/users/me/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Account deletion
  deleteAccount: () =>
    request("/users/me/account", {
      method: "DELETE",
    }),
};
