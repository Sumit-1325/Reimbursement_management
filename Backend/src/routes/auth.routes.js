/**
 * Authentication Routes
 * Handles user registration, login, refresh, logout, and profile endpoints
 */

import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
    forgotPassword,
    resetPassword
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/verify.middleware.js";

const router = express.Router();

/**
 * POST /api/auth/register
 * Public endpoint - Register new user with auto-company creation
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "companyName": "Acme Pvt Ltd",
 *   "country": "United States"
 * }
 */
router.post("/register", register);

/**
 * POST /api/auth/login
 * Public endpoint - Login user
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123"
 * }
 */
router.post("/login", login);

/**
 * POST /api/auth/refresh
 * Public endpoint - Refresh JWT access token
 * 
 * Body:
 * {
 *   "refreshToken": "refresh-token-string"
 * }
 */
router.post("/refresh", refreshToken);

/**
 * POST /api/auth/logout
 * Protected endpoint - Logout user (invalidate refresh token)
 */
router.post("/logout", authenticateToken, logout);

/**
 * GET /api/auth/me
 * Protected endpoint - Get current user profile
 */
router.get("/me", authenticateToken, getCurrentUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
