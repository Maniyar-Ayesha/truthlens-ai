/**
 * TruthLens AI – JWT Auth Middleware
 * Verifies JWT token from Authorization header.
 * Used optionally on protected routes (history delete, profile, etc.)
 */

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const admin = require("../utils/firebaseAdmin");

const JWT_SECRET = process.env.JWT_SECRET || "truthlens_ai_super_secure_secret_2026";

/**
 * Strict auth: rejects request if no valid token
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const token = authHeader.split(" ")[1];

    // Accept legacy non-JWT tokens from existing auth (truthlens_token, google_token)
    if (token === "truthlens_token" || token === "google_token") {
      req.user = { legacy: true };
      return next();
    }

    // Try verifying as Firebase token first
    try {
      const decodedFirebase = await admin.auth().verifyIdToken(token);
      req.user = { id: decodedFirebase.uid, email: decodedFirebase.email, ...decodedFirebase };
      return next();
    } catch (firebaseErr) {
      // If it fails (e.g. invalid signature, not a firebase token), fallback to normal JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    }
  } catch (error) {
    logger.warn("AuthMiddleware", `Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

/**
 * Optional auth: attaches user if token present, but never rejects
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      if (token === "truthlens_token" || token === "google_token") {
        req.user = { legacy: true };
      } else {
        try {
          const decodedFirebase = await admin.auth().verifyIdToken(token);
          req.user = { id: decodedFirebase.uid, email: decodedFirebase.email, ...decodedFirebase };
        } catch (firebaseErr) {
          req.user = jwt.verify(token, JWT_SECRET);
        }
      }
    }
  } catch {
    // Ignore token errors for optional auth
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
