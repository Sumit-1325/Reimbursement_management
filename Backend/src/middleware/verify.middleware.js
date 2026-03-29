/**
 * JWT Verification Middleware
 * Verifies JWT token and attaches user to request
 */

import { verifyToken } from "../utils/auth.js";

/**
 * Middleware to verify JWT and attach user to request
 * Extracts Bearer token from Authorization header
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.companyId = decoded.companyId;
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }
}
