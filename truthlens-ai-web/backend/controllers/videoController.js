/**
 * TruthLens AI – Video Controller (Upgraded)
 */
const { analyzeVideo } = require("../services/videoService");
const { VideoTimeoutError } = require("../utils/pythonRunner");
const logger = require("../utils/logger");
const fs = require("fs");

async function checkVideo(req, res, next) {
  console.log("VIDEO STEP 2 Controller reached");
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Video file is required." });
    }

    logger.info("VideoController", `Analyzing video: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
    const result = await analyzeVideo(req.file);
    console.log("VIDEO STEP 9 JSON returned");
    res.json(result);
  } catch (error) {
    if (req.file?.path) {
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
    }
    logger.error("VideoController", error.message);

    if (error instanceof VideoTimeoutError) {
      return res.status(408).json({
        success: false,
        message: "Video processing exceeded maximum time.",
        code: "VIDEO_TIMEOUT",
      });
    }

    if (error.statusCode === 503) {
      return res.status(503).json({
        success: false,
        message: "Video model unavailable.",
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
}

module.exports = { checkVideo };