/**
 * JWT Authentication Utilities
 * Contains token generation and verification functions
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

/**
 * Generate JWT token for user
 * @param {Object} user - User object with all required fields
 * @returns {string} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      designation: user.designation,
      firstName: user.firstName,
      lastName: user.lastName,
      isManager: user.isManager,
      isApprover: user.isApprover,
      managerId: user.managerId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid or expired token: ${error.message}`);
  }
}

/**
 * Generate a refresh token (random string)
 * @returns {string} Random refresh token
 */
export function generateRefreshTokenString() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculate refresh token expiry (30 days from now)
 * @returns {Date} Expiry date
 */
export function getRefreshTokenExpiry() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
  return expiryDate;
}

/**
 * Extract refresh token from request cookies or body
 * @param {Object} req - Express request object
 * @returns {string|null} Refresh token or null
 */
export function getRefreshTokenFromRequest(req) {
  // Try from cookies first (if using cookie middleware)
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }
  // Try from request body
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  // Try from Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}
