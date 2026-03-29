import api from "./api";

export const authApi = {
  register: async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    const payload = response.data.data;

    if (payload?.tokens?.accessToken) {
      localStorage.setItem("accessToken", payload.tokens.accessToken);
    }
    if (payload?.tokens?.refreshToken) {
      localStorage.setItem("refreshToken", payload.tokens.refreshToken);
    }

    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/api/auth/login", credentials);
    const payload = response.data.data;

    // Store tokens in localStorage
    if (payload?.tokens?.accessToken) {
      localStorage.setItem("accessToken", payload.tokens.accessToken);
    }
    if (payload?.tokens?.refreshToken) {
      localStorage.setItem("refreshToken", payload.tokens.refreshToken);
    }

    return response.data;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      // Clear tokens even if logout fails
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  },

  getUser: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await api.post("/api/auth/refresh", {
      refreshToken,
    });

    const { accessToken } = response.data.data;
    localStorage.setItem("accessToken", accessToken);

    return response.data;
  },

  createUserByAdmin: async (userData) => {
    const response = await api.post("/api/auth/users", userData);
    return response.data;
  },
};
