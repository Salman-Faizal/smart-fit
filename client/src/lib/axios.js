const normalizeHeaders = (headers = {}) => {
  const normalized = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      normalized.set(key, value);
    }
  });

  return normalized;
};

const parseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

const request = async (baseURL, method, url, data, config = {}) => {
  const { headers = {} } = config;

  const finalUrl = `${baseURL || ""}${url}`;

  const response = await fetch(finalUrl, {
    method,
    headers: normalizeHeaders(headers),
    body: method === "GET" || method === "DELETE" ? undefined : data,
  });

  const responseData = await parseBody(response);

  if (!response.ok) {
    const error = new Error("Request failed");
    error.response = {
      status: response.status,
      data: responseData,
    };
    throw error;
  }

  return {
    status: response.status,
    data: responseData,
    headers: response.headers,
    config,
  };
};

const create = ({ baseURL = "" } = {}) => ({
  get: (url, config) => request(baseURL, "GET", url, undefined, config),
  post: (url, data, config) => request(baseURL, "POST", url, data, config),
  put: (url, data, config) => request(baseURL, "PUT", url, data, config),
  delete: (url, config) => request(baseURL, "DELETE", url, undefined, config),
});

const axios = {
  create,
};

export default axios;
