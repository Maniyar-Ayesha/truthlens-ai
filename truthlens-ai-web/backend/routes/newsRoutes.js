/**
 * TruthLens AI – News Routes (Upgraded)
 * POST /api/check-news
 */
const express = require("express");
const router = express.Router();
const { checkNews } = require("../controllers/newsController");
const { validateNewsInput, sanitizeInputs } = require("../middlewares/validateInput");
const { aiLimiter } = require("../middlewares/rateLimiter");

router.post("/check-news", aiLimiter, sanitizeInputs, validateNewsInput, checkNews);

module.exports = router;