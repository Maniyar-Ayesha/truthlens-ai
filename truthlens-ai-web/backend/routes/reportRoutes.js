/**
 * TruthLens AI – Report Routes
 * POST /api/reports/generate   – Generate a PDF report for an analysis result
 * GET  /api/reports/:filename  – Download a generated report
 */
const express = require("express");
const router = express.Router();
const { generateReport, downloadReport } = require("../controllers/reportController");
const { aiLimiter } = require("../middlewares/rateLimiter");

router.post("/generate", aiLimiter, generateReport);
router.get("/:filename", downloadReport);

module.exports = router;
