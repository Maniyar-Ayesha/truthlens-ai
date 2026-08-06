/**
 * TruthLens AI – News Controller (Upgraded)
 */
const { analyzeNews } = require("../services/newsService");
const logger = require("../utils/logger");

async function checkNews(req, res, next) {
  try {
    const { text } = req.body;
    logger.info("NewsController", `Analysis requested (${text?.length || 0} chars)`);

    const result = await analyzeNews(text);
    res.json(result);
  } catch (error) {
    logger.error("NewsController", error.message);
    next(error);
  }
}

module.exports = { checkNews };