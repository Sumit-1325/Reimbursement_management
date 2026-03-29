/**
 * Main Express Server Entry Point
 * Initializes the server, connects to database, and starts listening
 */

import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";

// ... rest of your server code

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ALLOWED_ORIGINS = FRONTEND_URL
  .split(/\|\||,/) // supports "a||b" and "a,b"
  .map((origin) => origin.trim())
  .filter(Boolean);

// ============================================
// MIDDLEWARE
// ============================================

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Postman, same-origin server calls)
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Request logging middleware (simple)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Auth routes (register, login, refresh, logout)
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(NODE_ENV === "development" && { error: err.stack }),
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  🚀 Hackathon Backend Server Started    ║`);
  console.log(`╠════════════════════════════════════════╣`);
  console.log(`║  Environment: ${NODE_ENV.padEnd(28)} ║`);
  console.log(`║  Port: ${String(PORT).padEnd(32)} ║`);
  console.log(`║  URL: http://localhost:${String(PORT).padEnd(25)} ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});

export default app;
