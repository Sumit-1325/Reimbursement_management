import api from "./api";

export const authApi = {
  register: async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/api/auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      // Cookies are automatically cleared by server on logout
    }
  },

  getUser: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post("/api/auth/refresh");
    return response.data;
  },

  createUserByAdmin: async (userData) => {
    const response = await api.post("/api/auth/users", userData);
    return response.data;
  },
};
