import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // If auth failed (401/403) and not already retried, try refresh once.
    // Also skip refresh for refresh endpoint itself and logout
    const isRefreshEndpoint = String(originalRequest?.url).includes("/api/auth/refresh");
    const isLogoutEndpoint = String(originalRequest?.url).includes("/api/auth/logout");
    
    if ((status === 401 || status === 403) && !originalRequest._retry && !isRefreshEndpoint && !isLogoutEndpoint) {
      originalRequest._retry = true;

      try {
        // Refresh endpoint will use cookies automatically (withCredentials: true)
        const response = await api.post("/api/auth/refresh");

        // Retry original request with new token (in cookies)
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear user and redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
