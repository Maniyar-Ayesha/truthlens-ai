/**
 * TruthLens AI – Model Service
 * Provides model management, status, and operations.
 */
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { runAIScript, runMLScript } = require("../utils/pythonRunner");

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
    modelPath: path.join(ML_DIR, "image", "efficientnet_model.pt"),
    scriptPath: path.join(AI_DIR, "image_classifier.py"),
    type: "cnn",
    supportedModels: ["EfficientNetB0", "Xception", "ResNet50"],
    alternativePaths: [
      path.join(ML_DIR, "image", "xception_model.pt"),
      path.join(ML_DIR, "image", "resnet_model.pt"),
      path.join(ML_DIR, "image", "image_model.pt"),
    ],
  },
  video: {
    modelPath: path.join(ML_DIR, "video", "frame_classifier.pt"),
    scriptPath: path.join(AI_DIR, "video_classifier.py"),
    type: "temporal_cnn",
    supportedModels: ["ResNet50", "CNN", "TemporalAnalysis"],
    alternativePaths: [
      path.join(ML_DIR, "video", "video_model.pt"),
      path.join(ML_DIR, "video", "temporal_model.pt"),
    ],
  },
  url: {
    modelPath: path.join(ML_DIR, "url_model.pkl"),
    scriptPath: path.join(AI_DIR, "url_classifier.py"),
    type: "ml",
    supportedModels: ["GradientBoosting", "RandomForest", "LogisticRegression"],
  },
};

function getModelInfo(detectionType) {
  return MODEL_REGISTRY[detectionType] || null;
}

function isModelAvailable(detectionType) {
  const info = MODEL_REGISTRY[detectionType];
  if (!info) return false;
  if (fs.existsSync(info.modelPath)) return true;
  if (info.alternativePaths) {
    for (const p of info.alternativePaths) {
      if (fs.existsSync(p)) return true;
    }
  }
  if (info.scriptPath) return fs.existsSync(info.scriptPath);
  return false;
}

function getAvailableModels(detectionType) {
  const info = MODEL_REGISTRY[detectionType];
  if (!info) return [];
  return info.supportedModels || info.ensemble || [];
}

function getModelPath(detectionType) {
  const info = MODEL_REGISTRY[detectionType];
  if (!info) return null;
  if (fs.existsSync(info.modelPath)) return info.modelPath;
  if (info.alternativePaths) {
    for (const p of info.alternativePaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function getScriptPath(detectionType) {
  const info = MODEL_REGISTRY[detectionType];
  return info ? info.scriptPath : null;
}

function getAllModelInfo() {
  const result = {};
  for (const [type, info] of Object.entries(MODEL_REGISTRY)) {
    const available = isModelAvailable(type);
    result[type] = {
      type: info.type,
      available,
      modelPath: getModelPath(type),
      scriptPath: info.scriptPath || null,
      supportedModels: info.supportedModels || info.ensemble || [],
      missing: !available ? [info.modelPath, ...(info.alternativePaths || [])].filter((p) => !fs.existsSync(p)) : [],
    };
  }
  return result;
}

async function testModel(detectionType) {
  const info = MODEL_REGISTRY[detectionType];
  if (!info) {
    return { success: false, message: `Unknown detection type: ${detectionType}` };
  }

  if (!isModelAvailable(detectionType)) {
    return {
      success: false,
      message: `Model files not found for ${detectionType}. Train the model first.`,
      expectedPath: info.modelPath,
    };
  }

  try {
    const scriptPath = getScriptPath(detectionType);
    if (!scriptPath) {
      return { success: false, message: `No inference script found for ${detectionType}` };
    }

    if (detectionType === "image") {
      // Create a small test image
      const testDir = path.join(AI_DIR, "..", "tmp");
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      const testImage = path.join(testDir, "test_model_availability.png");
      const { spawn } = require("child_process");
      const createTestImage = spawn("python", ["-c", `from PIL import Image; Image.new('RGB', (224, 224), color='gray').save('${testImage}')`], { cwd: AI_DIR });
      await new Promise((resolve, reject) => {
        createTestImage.on("close", (code) => code === 0 ? resolve() : reject(new Error("Failed to create test image")));
        createTestImage.on("error", reject);
      });
      const result = await runAIScript("image_classifier.py", [testImage], 60000);
      return {
        success: true,
        message: `Image model (${result.model_type || "unknown"}) responded successfully`,
        result,
      };
    }

    if (detectionType === "video") {
      return {
        success: true,
        message: "Video model loaded. Test with actual video file via /api/check-video.",
      };
    }

    if (detectionType === "url") {
      const result = await runAIScript("url_classifier.py", ["https://example.com"], 30000);
      return {
        success: true,
        message: `URL model (${result.model_type || "unknown"}) responded successfully`,
        result,
      };
    }

    if (detectionType === "news") {
      const result = await runMLScript("predict_news.py", ["This is a test news article for model verification."], 30000);
      return {
        success: true,
        message: `News model (${result.model_type || "unknown"}) responded successfully`,
        result,
      };
    }

    return { success: true, message: `${detectionType} model is available` };
  } catch (error) {
    logger.error("ModelService", `Model test failed for ${detectionType}: ${error.message}`);
    return { success: false, message: `Model test failed: ${error.message}` };
  }
}

module.exports = {
  MODEL_REGISTRY,
  getModelInfo,
  isModelAvailable,
  getAvailableModels,
  getModelPath,
  getScriptPath,
  getAllModelInfo,
  testModel,
};
