/**
 * TruthLens AI – Image Controller (Upgraded)
 */
const { analyzeImage } = require("../services/imageService");
const { performReverseSearch } = require("../services/reverseImageSearch");
const logger = require("../utils/logger");
const fs = require("fs");

async function checkImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required." });
    }

    logger.info("ImageController", `Analyzing image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    const result = await analyzeImage(req.file.path);
    res.json(result);
  } catch (error) {
    if (req.file?.path) {
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
    }
    logger.error("ImageController", error.message);
    next(error);
  }
}

async function reverseSearchImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required." });
    }

    logger.info("ImageController", `Reverse search: ${req.file.originalname}`);
    const result = await performReverseSearch(req.file.path);
    res.json(result);
  } catch (error) {
    if (req.file?.path) {
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
    }
    logger.error("ImageController", error.message);
    next(error);
  }
}

module.exports = { checkImage, reverseSearchImage };