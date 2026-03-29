import api from "./api";

export const managerApi = {
  getApprovalsToReview: async () => {
    const response = await api.get("/api/manager/approvals-to-review");
    return response.data;
  },

  actOnApproval: async (expenseId, payload) => {
    const response = await api.patch(`/api/manager/approvals/${expenseId}/action`, payload);
    return response.data;
  },

  getApprovalHistory: async () => {
    const response = await api.get("/api/manager/approval-history");
    return response.data;
  },
};
