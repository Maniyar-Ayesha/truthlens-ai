/**
 * TruthLens AI – Model Routes
 * GET  /api/models               – List all model statuses
 * GET  /api/models/:type         – Get specific model info
 * POST /api/models/:type/test    – Test a model
 */
const express = require("express");
const router = express.Router();
const { getModels, getModel, testModel } = require("../controllers/modelController");
const { optionalAuth } = require("../middlewares/authMiddleware");

router.get("/", optionalAuth, getModels);
router.get("/:type", optionalAuth, getModel);
router.post("/:type/test", optionalAuth, testModel);

module.exports = router;
