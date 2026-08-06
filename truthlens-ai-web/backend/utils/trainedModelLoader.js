const fs = require("fs");
const path = require("path");
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

class TrainedModelLoader {
  constructor() {
    this.loadedModels = new Map();
    this.loadedVectorizers = new Map();
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

  getModelInfo(detectionType) {
    return MODEL_REGISTRY[detectionType] || null;
  }

  getAvailableModels(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    if (!info) return [];
    return info.supportedModels || info.ensemble || [];
  }

  getModelPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    if (!info) return null;
    if (info.frameClassifierPath) return info.frameClassifierPath;
    return info.modelPath || null;
  }

  getTemporalModelPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.temporalModelPath || null : null;
  }

  getLipSyncModelPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.lipSyncModelPath || null : null;
  }

  getVectorizerPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.vectorizerPath : null;
  }

  getScriptPath(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.scriptPath : null;
  }

  getModelType(detectionType) {
    const info = MODEL_REGISTRY[detectionType];
    return info ? info.type : "unknown";
  }

  async loadModel(detectionType) {
    const cacheKey = detectionType;
    if (this.loadedModels.has(cacheKey)) {
      return this.loadedModels.get(cacheKey);
    }

    const info = MODEL_REGISTRY[detectionType];
    if (!info) {
      throw new Error(`Unknown detection type: ${detectionType}`);
    }

    const modelInfo = {
      type: info.type,
      detectionType,
      modelPath: info.frameClassifierPath || info.modelPath || null,
      vectorizerPath: info.vectorizerPath || null,
      scriptPath: info.scriptPath || null,
      supportedModels: info.supportedModels || info.ensemble || [],
      available: this.isModelAvailable(detectionType),
    };

    this.loadedModels.set(cacheKey, modelInfo);
    return modelInfo;
  }

  async loadVectorizer(detectionType) {
    const cacheKey = `${detectionType}:vectorizer`;
    if (this.loadedVectorizers.has(cacheKey)) {
      return this.loadedVectorizers.get(cacheKey);
    }

    const info = MODEL_REGISTRY[detectionType];
    if (!info || !info.vectorizerPath) {
      return null;
    }

    if (!fs.existsSync(info.vectorizerPath)) {
      logger.warn("TrainedModelLoader", `Vectorizer not found for ${detectionType}`);
      return null;
    }

    const vectorizerInfo = {
      path: info.vectorizerPath,
      detectionType,
      available: true,
    };

    this.loadedVectorizers.set(cacheKey, vectorizerInfo);
    return vectorizerInfo;
  }

  getAllModelInfo() {
    const result = {};
    for (const [type, info] of Object.entries(MODEL_REGISTRY)) {
      result[type] = {
        type: info.type,
        available: this.isModelAvailable(type),
        modelPath: info.frameClassifierPath || info.modelPath || null,
        vectorizerPath: info.vectorizerPath || null,
        scriptPath: info.scriptPath || null,
        supportedModels: info.supportedModels || info.ensemble || [],
      };
    }
    return result;
  }

  clearCache() {
    this.loadedModels.clear();
    this.loadedVectorizers.clear();
  }

  getModelStatus() {
    const status = {};
    for (const [type, info] of Object.entries(MODEL_REGISTRY)) {
      status[type] = {
        available: this.isModelAvailable(type),
        type: info.type,
        modelPath: info.frameClassifierPath || info.modelPath || null,
        scriptPath: info.scriptPath || null,
      };
    }
    return status;
  }
}

const trainedModelLoader = new TrainedModelLoader();

module.exports = { TrainedModelLoader, trainedModelLoader, MODEL_REGISTRY };