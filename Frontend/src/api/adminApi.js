import api from "./api";

export const adminApi = {
  getAllUsers: async ({ page = 1, limit = 100, search = "" } = {}) => {
    const params = { page, limit };
    if (search && search.trim()) {
      params.search = search.trim();
    }

    const response = await api.get("/api/admin/users", { params });
    return response.data;
  },

  createUser: async (payload) => {
    const response = await api.post("/api/admin/users", payload);
    return response.data;
  },

  updateUser: async (userId, payload) => {
    const response = await api.put(`/api/admin/users/${userId}`, payload);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  getApprovalRules: async () => {
    const response = await api.get("/api/admin/approval-rules");
    return response.data;
  },

  updateApprovalRule: async (ruleId, payload) => {
    const response = await api.put(`/api/admin/approval-rules/${ruleId}`, payload);
    return response.data;
  },

  getPendingExpenses: async () => {
    const response = await api.get("/api/admin/pending-expenses");
    return response.data;
  },

  assignRuleToExpense: async (ruleId, expenseId) => {
    const response = await api.post(`/api/admin/approval-rules/${ruleId}/assign/${expenseId}`);
    return response.data;
  },
};
