/**
 * TruthLens AI – Model Controller
 * Exposes model management endpoints.
 */
const { getAllModelInfo, isModelAvailable, getModelInfo, testModel: testModelService } = require("../services/modelService");
const logger = require("../utils/logger");

async function getModels(req, res, next) {
  try {
    const models = getAllModelInfo();
    res.json({ success: true, models });
  } catch (error) {
    logger.error("ModelController", error.message);
    next(error);
  }
}

async function getModel(req, res, next) {
  try {
    const { type } = req.params;
    const info = getModelInfo(type);
    if (!info) {
      return res.status(404).json({ success: false, message: `Unknown model type: ${type}` });
    }
    const available = isModelAvailable(type);
    res.json({ success: true, type, available, info });
  } catch (error) {
    logger.error("ModelController", error.message);
    next(error);
  }
}

async function testModelHandler(req, res, next) {
  try {
    const { type } = req.params;
    const result = await testModelService(type);
    res.json({ success: result.success, type, ...result });
  } catch (error) {
    logger.error("ModelController", error.message);
    next(error);
  }
}

module.exports = { getModels, getModel, testModel: testModelHandler };
