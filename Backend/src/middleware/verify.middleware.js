/**
 * JWT Verification Middleware
 * Verifies JWT token and attaches user to request
 */

import { verifyToken } from "../utils/auth.js";

/**
 * Middleware to verify JWT and attach user to request
 * Extracts token from cookies or Authorization header
 */
export function authenticateToken(req, res, next) {
  // Try to get token from cookies first, then from Authorization header
  let token = req.cookies?.accessToken;
  
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
  }

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
