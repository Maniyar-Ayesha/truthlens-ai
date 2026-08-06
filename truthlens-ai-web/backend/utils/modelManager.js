/**
 * TruthLens AI – Model Manager
 * Dynamically loads and manages ML models for all detection modules.
 * Supports future model replacement without changing frontend or controllers.
 */

const path = require("path");
const fs = require("fs");
const logger = require("./logger");

const ML_DIR = path.join(__dirname, "..", "ml");
const AI_DIR = path.join(__dirname, "..", "ai");

const MODEL_REGISTRY = {
  news: {
    modelPath: path.join(ML_DIR, "news_model.pkl"),
    vectorizerPath: path.join(ML_DIR, "vectorizer.pkl"),
    scriptPath: path.join(ML_DIR, "predict_news.py"),
    type: "sklearn",
    ensemble: ["LogisticRegression", "RandomForest", "NaiveBayes"],
  },
  image: {
    scriptPath: path.join(AI_DIR, "image_classifier.py"),
    type: "cnn",
    supportedModels: ["EfficientNetB0", "Xception", "ResNet50", "VisionTransformer"],
  },
  video: {
    frameClassifierPath: path.join(ML_DIR, "video", "frame_classifier.pt"),
    temporalModelPath: path.join(ML_DIR, "video", "temporal_model.pt"),
    lipSyncModelPath: path.join(ML_DIR, "video", "lip_sync_model.pt"),
    scriptPath: path.join(AI_DIR, "video_classifier.py"),
    type: "temporal_cnn",
    supportedModels: ["ResNet50", "TemporalMLP", "LipSyncMLP"],
  },
  url: {
    modelPath: path.join(ML_DIR, "url_model.pkl"),
    scriptPath: path.join(AI_DIR, "url_classifier.py"),
    type: "ml",
    supportedModels: ["LogisticRegression", "RandomForest", "GradientBoosting"],
  },
};

class ModelManager {
  constructor() {
    this.models = new Map();
    this.vectorizers = new Map();
  }

  getModelInfo(detectionType) {
    return MODEL_REGISTRY[detectionType] || null;
  }

  getAvailableModels(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    if (!info) return [];
    return info.supportedModels || info.ensemble || [];
  }

  isModelAvailable(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    if (!info) return false;
    if (info.frameClassifierPath) {
      return (
        fs.existsSync(info.frameClassifierPath) &&
        fs.existsSync(info.temporalModelPath) &&
        fs.existsSync(info.lipSyncModelPath)
      );
    }
    if (info.modelPath) return fs.existsSync(info.modelPath);
    return fs.existsSync(info.scriptPath);
  }

  getModelPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    if (!info) return null;
    if (info.frameClassifierPath) return info.frameClassifierPath;
    return info.modelPath || null;
  }

  getScriptPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.scriptPath : null;
  }

  getModelType(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.type : "unknown";
  }

  getAllModelInfo() {
    const result = {};
    for (const [type, info] of Object.entries(MODEL_REGISTRY)) {
      result[type] = {
        type: info.type,
        available: this.isModelAvailable(type),
        modelPath: info.modelPath || null,
        scriptPath: info.scriptPath || null,
        supportedModels: info.supportedModels || info.ensemble || [],
      };
    }
    return result;
  }

  clearCache() {
    this.models.clear();
    this.vectorizers.clear();
  }
}

module.exports = { ModelManager, MODEL_REGISTRY };