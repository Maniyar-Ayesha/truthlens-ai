/**
 * TruthLens AI – Chat Controller (Upgraded)
 */
const { chat } = require("../services/chatService");
const logger = require("../utils/logger");

async function handleChat(req, res, next) {
  try {
    const { message, history, email } = req.body;
    logger.info("ChatController", `Message received (${message?.length || 0} chars)`);

    const reply = await chat(
      message,
      Array.isArray(history) ? history : [],
      email || null
    );
    res.json({ reply });
  } catch (error) {
    logger.error("ChatController", error.message);

    if (error.statusCode === 503) {
      return res.status(503).json({ reply: error.message });
    }

    const friendlyMsg = error.message || "AI chat is temporarily unavailable. Please try again.";
    res.status(500).json({ reply: friendlyMsg });
  }
}

module.exports = { handleChat };