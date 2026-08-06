/**
 * TruthLens AI – URL Routes (Upgraded)
 * POST /api/check-url
 */
const express = require("express");
const router = express.Router();

const { checkUrl } = require("../controllers/urlController");
const { validateUrlInput, sanitizeInputs } = require("../middlewares/validateInput");
const { aiLimiter } = require("../middlewares/rateLimiter");

router.post("/check-url", aiLimiter, sanitizeInputs, validateUrlInput, checkUrl);

module.exports = router;