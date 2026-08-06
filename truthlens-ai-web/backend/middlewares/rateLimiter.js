/**
 * TruthLens AI – Rate Limiter Middleware
 * Uses express-rate-limit to protect all routes.
 */

const rateLimit = require("express-rate-limit");

/** General limiter: 150 requests per 15 minutes per IP */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});

/** AI analysis limiter: 30 requests per 15 minutes per IP (heavier endpoints) */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many analysis requests. Please wait before trying again.",
  },
});

/** Chat limiter: 60 messages per 15 minutes per IP */
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Chat rate limit reached. Please slow down.",
  },
});

/** Auth limiter: 20 auth attempts per 15 minutes per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

module.exports = { generalLimiter, aiLimiter, chatLimiter, authLimiter };
