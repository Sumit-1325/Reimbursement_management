import api from "./api";

export const employeeApi = {
  getCompanyEmployees: async () => {
    const response = await api.get("/api/expenses/employees");
    return response.data;
  },

  getSupportedCurrencies: async () => {
    const response = await api.get("/api/expenses/currencies");
    return response.data;
  },

  getMyExpenses: async () => {
    const response = await api.get("/api/expenses/mine");
    return response.data;
  },

  createExpense: async (payload) => {
    const response = await api.post("/api/expenses", payload);
    return response.data;
  },

  updateDraftExpense: async (expenseId, payload) => {
    const response = await api.patch(`/api/expenses/${expenseId}`, payload);
    return response.data;
  },

  submitDraftExpense: async (expenseId) => {
    const response = await api.patch(`/api/expenses/${expenseId}/submit`);
    return response.data;
  },

  getExpenseById: async (expenseId) => {
    const response = await api.get(`/api/expenses/${expenseId}`);
    return response.data;
  },
};
