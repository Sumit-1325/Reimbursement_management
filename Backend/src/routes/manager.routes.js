import express from "express";
import { authenticateToken } from "../middleware/verify.middleware.js";
import { authorizeRole } from "../middleware/authorization.middleware.js";
import {
  actOnApprovalByManager,
  getApprovalsToReviewByManager,
} from "../controllers/manager.controller.js";

const router = express.Router();

/**
 * GET /api/manager/approvals-to-review
 * MANAGER: list currently visible approvals to review
 */
router.get(
  "/approvals-to-review",
  authenticateToken,
  authorizeRole("MANAGER"),
  getApprovalsToReviewByManager
);

/**
 * PATCH /api/manager/approvals/:expenseId/action
 * MANAGER: approve or reject assigned approval request
 */
router.patch(
  "/approvals/:expenseId/action",
  authenticateToken,
  authorizeRole("MANAGER"),
  actOnApprovalByManager
);

export default router;
