import express from "express";
import { authenticateToken } from "../middleware/verify.middleware.js";
import { authorizeRole } from "../middleware/authorization.middleware.js";
import {
	assignApprovalRuleToExpenseByAdmin,
	createUserByAdmin,
	deleteUserByAdmin,
	getAllUsersByAdmin,
	getApprovalRulesByAdmin,
	getPendingExpensesByAdmin,
	getRecentActivitiesByAdmin,
	updateApprovalRuleByAdmin,
	updateUserByAdmin,
} from "../controllers/admin.controller.js";

const router = express.Router();

/**
 * GET /api/admin/users
 * ADMIN: list all users in same company
 */
router.get("/users", authenticateToken, authorizeRole("ADMIN"), getAllUsersByAdmin);

/**
 * POST /api/admin/users
 * ADMIN: create MANAGER/EMPLOYEE in same company
 */
router.post(
	"/users",
	authenticateToken,
	authorizeRole("ADMIN"),
	createUserByAdmin
);

/**
 * PUT /api/admin/users/:userId
 * ADMIN: update user fields except password
 */
router.put(
	"/users/:userId",
	authenticateToken,
	authorizeRole("ADMIN"),
	updateUserByAdmin
);

/**
 * DELETE /api/admin/users/:userId
 * ADMIN: delete user in same company
 */
router.delete(
	"/users/:userId",
	authenticateToken,
	authorizeRole("ADMIN"),
	deleteUserByAdmin
);

/**
 * GET /api/admin/approval-rules
 * ADMIN: list approval rules
 */
router.get(
	"/approval-rules",
	authenticateToken,
	authorizeRole("ADMIN"),
	getApprovalRulesByAdmin
);

/**
 * PUT /api/admin/approval-rules/:ruleId
 * ADMIN: update approval rule
 */
router.put(
	"/approval-rules/:ruleId",
	authenticateToken,
	authorizeRole("ADMIN"),
	updateApprovalRuleByAdmin
);

/**
 * GET /api/admin/pending-expenses
 * ADMIN: list pending expenses for approval assignment
 */
router.get(
	"/pending-expenses",
	authenticateToken,
	authorizeRole("ADMIN"),
	getPendingExpensesByAdmin
);

/**
 * GET /api/admin/recent-activities
 * ADMIN: list recent rule and assignment activities
 */
router.get(
	"/recent-activities",
	authenticateToken,
	authorizeRole("ADMIN"),
	getRecentActivitiesByAdmin
);

/**
 * POST /api/admin/approval-rules/:ruleId/assign/:expenseId
 * ADMIN: generate approval chain for expense
 */
router.post(
	"/approval-rules/:ruleId/assign/:expenseId",
	authenticateToken,
	authorizeRole("ADMIN"),
	assignApprovalRuleToExpenseByAdmin
);

export default router;
