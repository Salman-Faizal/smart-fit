import { storage } from "./storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://smart-fit-cnax.onrender.com";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.payload = data;
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
  createPayHereCheckout: (orderId) =>
    request(`/payments/orders/${orderId}/payhere-checkout`, {
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
  getRecentlyViewed: () => request("/users/me/recently-viewed"),
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
};
