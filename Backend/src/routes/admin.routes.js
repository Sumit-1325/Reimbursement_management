import express from "express";
import { authenticateToken } from "../middleware/verify.middleware.js";
import { authorizeRole } from "../middleware/authorization.middleware.js";
import { createUserByAdmin, deleteUserByAdmin, getAllUsersByAdmin, updateUserByAdmin } from "../controllers/admin.controller.js";

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

export default router;
