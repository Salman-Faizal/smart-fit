import { storage } from "./storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export const assetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const root = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${root}${path}`;
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
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params);
    const queryString = query.toString();
    return request(`/products${queryString ? `?${queryString}` : ""}`);
  },
  getProductById: (id) => request(`/products/${id}`),
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
};
