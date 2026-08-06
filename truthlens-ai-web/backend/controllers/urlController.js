/**
 * TruthLens AI – URL Controller (Upgraded)
 */
const { analyzeUrl } = require("../services/urlService");
const logger = require("../utils/logger");

async function checkUrl(req, res, next) {
  try {
    const { url } = req.body;
    logger.info("UrlController", `Analyzing URL: ${url}`);

    const result = await analyzeUrl(url);
    res.json(result);
  } catch (error) {
    logger.error("UrlController", error.message);
    next(error);
  }
}

module.exports = { checkUrl };