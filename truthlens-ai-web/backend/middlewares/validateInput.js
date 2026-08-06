/**
 * TruthLens AI – Input Validation & Sanitization Middleware
 * Sanitizes text inputs to prevent XSS and validates common fields.
 */

const xss = require("xss");

/**
 * Sanitize a string value using xss library
 */
function sanitize(value) {
  if (typeof value !== "string") return value;
  return xss(value.trim());
}

/**
 * Sanitize req.body text and url fields on every request
 */
function sanitizeInputs(req, res, next) {
  if (req.body) {
    if (typeof req.body.text === "string") {
      req.body.text = sanitize(req.body.text);
    }
    if (typeof req.body.url === "string") {
      req.body.url = sanitize(req.body.url);
    }
    if (typeof req.body.message === "string") {
      req.body.message = sanitize(req.body.message);
    }
    if (typeof req.body.email === "string") {
      req.body.email = sanitize(req.body.email).toLowerCase();
    }
  }
  next();
}

/**
 * Validate news text: required, min 10 chars, max 10000 chars
 */
function validateNewsInput(req, res, next) {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "News text is required." });
  }

  if (text.trim().length < 10) {
    return res.status(400).json({ success: false, message: "News text is too short. Please enter at least 10 characters." });
  }

  if (text.trim().length > 10000) {
    return res.status(400).json({ success: false, message: "News text is too long. Maximum 10,000 characters allowed." });
  }

  next();
}

/**
 * Validate URL input
 */
function validateUrlInput(req, res, next) {
  const { url } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ success: false, message: "URL is required." });
  }

  if (url.trim().length > 2048) {
    return res.status(400).json({ success: false, message: "URL is too long." });
  }

  next();
}

/**
 * Validate chat message input
 */
function validateChatInput(req, res, next) {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  if (message.trim().length > 2000) {
    return res.status(400).json({ success: false, message: "Message is too long. Maximum 2,000 characters." });
  }

  next();
}

module.exports = {
  sanitize,
  sanitizeInputs,
  validateNewsInput,
  validateUrlInput,
  validateChatInput,
};
