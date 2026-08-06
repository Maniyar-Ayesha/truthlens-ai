/**
 * TruthLens AI – Dashboard Routes
 * GET  /api/dashboard/stats/:email  – Dashboard statistics
 * GET  /api/dashboard/trends/:email – Analysis trends
 */
const express = require("express");
const router = express.Router();
const { getDashboardStats, getTypeTrends } = require("../services/dashboardService");
const { optionalAuth } = require("../middlewares/authMiddleware");

router.get("/dashboard/stats/:email", optionalAuth, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.params.email);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/trends/:email", optionalAuth, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await getTypeTrends(req.params.email, days);
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

module.exports = router;