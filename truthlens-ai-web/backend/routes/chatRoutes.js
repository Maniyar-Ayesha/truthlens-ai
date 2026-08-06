/**
 * TruthLens AI – Chat Routes (Upgraded)
 * POST /api/chat
 */
const express = require("express");
const router = express.Router();

const { handleChat } = require("../controllers/chatController");
const { validateChatInput, sanitizeInputs } = require("../middlewares/validateInput");
const { chatLimiter } = require("../middlewares/rateLimiter");

router.post("/chat", chatLimiter, sanitizeInputs, validateChatInput, handleChat);

module.exports = router;