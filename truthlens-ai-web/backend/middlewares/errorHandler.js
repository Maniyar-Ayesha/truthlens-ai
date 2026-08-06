/**
 * TruthLens AI – Global Error Handler Middleware
 * Catches all unhandled errors and returns clean JSON.
 * Never leaks stack traces to the client in production.
 */

const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Log full error server-side
  logger.error("ErrorHandler", `${req.method} ${req.path} → ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build safe client message
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "An internal error occurred. Please try again."
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
