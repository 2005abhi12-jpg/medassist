import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach JWT ────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || "");
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// ─── Response interceptor: log + handle 401 ─────────
API.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status}`, response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    console.error(`[API] ❌ ${status}`, errorData || error.message);

    // Auto-redirect to login on 401 (expired/invalid token)
    if (status === 401) {
      const errorCode = errorData?.error?.code;
      if (errorCode === "AUTH_TOKEN_EXPIRED" || errorCode === "AUTH_TOKEN_INVALID" || errorCode === "AUTH_TOKEN_MISSING" || errorCode === "AUTH_USER_NOT_FOUND") {
        localStorage.clear();
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default API;
