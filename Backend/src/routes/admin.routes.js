import express from "express";
import { authenticateToken } from "../middleware/verify.middleware.js";
import { authorizeRole } from "../middleware/authorization.middleware.js";
import { createUserByAdmin, getAllUsersByAdmin } from "../controllers/admin.controller.js";

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

export default router;
