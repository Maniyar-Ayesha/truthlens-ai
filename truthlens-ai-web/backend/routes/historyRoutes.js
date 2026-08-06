/**
 * TruthLens AI – History Routes
 * POST   /api/history             – Save record
 * GET    /api/history             – Get all history (with optional email filter)
 * GET    /api/history/:id         – Get single record by ID
 * DELETE /api/history/:id         – Delete single record by ID
 * DELETE /api/history             – Clear all history
 */
const express = require("express");
const router = express.Router();

const {
  saveHistory,
  getHistory,
  getHistoryById,
  deleteHistoryRecord,
  clearHistory,
} = require("../controllers/historyController");
const { optionalAuth } = require("../middlewares/authMiddleware");

router.post("/history", optionalAuth, saveHistory);
router.get("/history", optionalAuth, getHistory);
router.get("/history/:id", optionalAuth, getHistoryById);
router.delete("/history/:id", optionalAuth, deleteHistoryRecord);
router.delete("/history", optionalAuth, clearHistory);

module.exports = router;