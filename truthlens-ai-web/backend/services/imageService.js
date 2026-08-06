/**
 * TruthLens AI – Image Analysis Service (Upgraded)
 * ======================================================
 * Enhanced pipeline with multiple detection methods:
 *
 *  1. Local CNN Model (EfficientNetB0 / Xception / ResNet50 / ViT)
 *  2. Sightengine API (genai + deepfake models)
 *  3. Image Metadata Analysis (EXIF, format, dimensions)
 *  4. Error Level Analysis (ELA)
 *  5. Noise Analysis
 *  6. Heatmap Generation
 *  7. Weighted Confidence Combination
 *  8. AI Explanation
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const sharp = require("sharp");
const { calculateTrustScore } = require("../utils/trustScore");
const { formatImageResponse } = require("../utils/responseFormatter");
const { globalCache } = require("../utils/cache");
const { ModelManager } = require("../utils/modelManager");
const { runAIScript } = require("../utils/pythonRunner");
const { mapConfidence } = require("../utils/confidenceMapper");
const { runForensicPredict } = require("../utils/forensicPredict");
const logger = require("../utils/logger");

const API_USER = process.env.SIGHTENGINE_API_USER;
const API_SECRET = process.env.SIGHTENGINE_API_SECRET;

const modelManager = new ModelManager();

// ─────────────────────────────────────────────────────────────────────
// Step 1: Local CNN Model Analysis
// ─────────────────────────────────────────────────────────────────────
async function runCNNModel(filePath) {
  const cacheKey = `image_cnn:${filePath}`;
  return globalCache.get(cacheKey) || globalCache.set(cacheKey, _runCNNModel(filePath), 300000);
}

async function _runCNNModel(filePath) {
  const modelPath = modelManager.getScriptPath("image");
  if (!modelPath || !fs.existsSync(modelPath)) {
    logger.warn("ImageService", "CNN model script not found, skipping local model");
    return null;
  }

  try {
    const result = await runAIScript("image_classifier.py", [filePath], 60000);
    return {
      status: result.status || "UNCERTAIN",
      confidence: result.confidence || 50,
      modelType: result.model_type || "EfficientNetB0",
      manipulatedRegions: result.manipulated_regions || [],
      heatmapUrl: result.heatmap_url || null,
      topPredictions: result.top_predictions || [],
      fakeProb: result.fake_prob || 0,
      realProb: result.real_prob || 100,
    };
  } catch (error) {
    logger.warn("ImageService", `CNN model failed (non-fatal): ${error.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 2: Sightengine Analysis
// ─────────────────────────────────────────────────────────────────────
async function runSightengine(filePath) {
  if (!API_USER || !API_SECRET) {
    logger.warn("ImageService", "Sightengine API credentials not configured");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("media", fs.createReadStream(filePath));
    formData.append("models", "genai,deepfake");
    formData.append("api_user", API_USER);
    formData.append("api_secret", API_SECRET);

    const response = await axios.post(
      "https://api.sightengine.com/1.0/check.json",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 180000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    logger.debug("ImageService", "Sightengine response received", {
      aiGenerated: response.data?.type?.ai_generated,
      deepfake: response.data?.type?.deepfake,
    });

    return response.data;
  } catch (error) {
    logger.warn("ImageService", `Sightengine failed (non-fatal): ${error.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 3: Image Metadata Analysis
// ─────────────────────────────────────────────────────────────────────
async function analyzeMetadata(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    const points = [];

    if (meta.width && meta.height) {
      points.push(`Image dimensions: ${meta.width}×${meta.height}px`);
    }
    if (meta.format) {
      points.push(`Format: ${meta.format.toUpperCase()}`);
    }
    if (meta.exif) {
      points.push("EXIF metadata present in image");
    } else {
      points.push("No EXIF metadata found (common in AI-generated images)");
    }
    if (meta.density) {
      points.push(`Pixel density: ${meta.density} DPI`);
    }
    if (meta.width && meta.width < 100) {
      points.push("Warning: Image is unusually small");
    }

    return { points, hasExif: !!meta.exif, format: meta.format, width: meta.width, height: meta.height };
  } catch (error) {
    logger.warn("ImageService", `Metadata analysis failed (non-fatal): ${error.message}`);
    return { points: ["Metadata analysis unavailable"], hasExif: null, format: null, width: null, height: null };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 4: Error Level Analysis (ELA)
// ─────────────────────────────────────────────────────────────────────
async function runELA(filePath) {
  try {
    const result = await runAIScript("ela_analyzer.py", [filePath], 30000);
    return {
      elaScore: result.ela_score || 0,
      manipulatedRegions: result.manipulated_regions || [],
      heatmapUrl: result.heatmap_url || null,
      points: result.points || [],
    };
  } catch (error) {
    logger.warn("ImageService", `ELA analysis failed (non-fatal): ${error.message}`);
    return { elaScore: 0, manipulatedRegions: [], heatmapUrl: null, points: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 5: Noise Analysis
// ─────────────────────────────────────────────────────────────────────
async function runNoiseAnalysis(filePath) {
  try {
    const result = await runAIScript("noise_analyzer.py", [filePath], 30000);
    return {
      noiseLevel: result.noise_level || 0,
      noiseUniformity: result.noise_uniformity || 0.5,
      isUniformNoise: result.is_uniform_noise !== false,
      manipulatedRegions: result.manipulated_regions || [],
      points: result.points || [],
    };
  } catch (error) {
    logger.warn("ImageService", `Noise analysis failed (non-fatal): ${error.message}`);
    return { noiseLevel: 0, noiseUniformity: 0.5, isUniformNoise: true, manipulatedRegions: [], points: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 6: Extract risk score from Sightengine response
// ─────────────────────────────────────────────────────────────────────
function extractSightengineRisk(data) {
  if (!data) return null;
  const aiGenerated = data?.type?.ai_generated;
  const deepfake = data?.type?.deepfake;
  const scores = [aiGenerated, deepfake].filter((v) => typeof v === "number");
  if (scores.length === 0) return null;
  return {
    riskScore: Math.max(...scores),
    aiGeneratedProb: aiGenerated ?? null,
    deepfakeProb: deepfake ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────────────────────────────
async function analyzeImage(filePath) {
  const startTime = Date.now();

  // Run all analyses in parallel
  const [cnnResult, sightengineData, metadata, elaResult, noiseResult] = await Promise.all([
    runCNNModel(filePath),
    runSightengine(filePath),
    analyzeMetadata(filePath),
    runELA(filePath),
    runNoiseAnalysis(filePath),
  ]);

  const forensicResult = await runForensicPredict({
    ela_score: elaResult?.elaScore || 0,
    noise_level: noiseResult?.noiseLevel || 0,
    noise_uniformity: noiseResult?.noiseUniformity || 0.5,
    has_exif: metadata?.hasExif ? 1 : 0,
    width_norm: Math.min(1, (metadata?.width || 512) / 2048),
    height_norm: Math.min(1, (metadata?.height || 512) / 2048),
    compression_artifact: elaResult?.elaScore || 0,
    edge_inconsistency: noiseResult?.isUniformNoise ? 0.7 : 0.2,
  });

  // Cleanup uploaded file
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

  // ── Combine scores from all sources ──────────────────────────────
  const scores = [];

  // CNN Model score
  if (cnnResult) {
    const cnnScore = cnnResult.status === "FAKE" ? cnnResult.confidence : 100 - cnnResult.confidence;
    scores.push({ source: "CNN Model", score: cnnScore, weight: 0.30, status: cnnResult.status });
  }

  // Trained forensic ensemble
  if (forensicResult && !forensicResult.error) {
    const fScore = forensicResult.status === "FAKE" ? forensicResult.fake_prob : forensicResult.fake_prob;
    scores.push({
      source: "Forensic Ensemble",
      score: fScore,
      weight: cnnResult ? 0.15 : 0.35,
      status: forensicResult.status,
    });
  }

  // Sightengine score
  const seRisk = extractSightengineRisk(sightengineData);
  if (seRisk) {
    scores.push({ source: "Sightengine", score: seRisk.riskScore * 100, weight: 0.20, status: seRisk.riskScore > 0.5 ? "FAKE" : "REAL" });
  }

  // ELA score
  if (elaResult && elaResult.elaScore > 0) {
    const elaScore = Math.min(100, elaResult.elaScore * 100);
    scores.push({ source: "Error Level Analysis", score: elaScore, weight: 0.15, status: elaScore > 50 ? "FAKE" : "REAL" });
  }

  // Noise analysis score
  if (noiseResult && noiseResult.noiseLevel > 0) {
    const noiseScore = noiseResult.isUniformNoise ? noiseResult.noiseLevel * 30 : noiseResult.noiseLevel * 60;
    scores.push({ source: "Noise Analysis", score: Math.min(100, noiseScore), weight: 0.10, status: noiseScore > 50 ? "FAKE" : "REAL" });
  }

  // Metadata heuristic
  if (!metadata.hasExif) {
    scores.push({ source: "Metadata Analysis", score: 65, weight: 0.10, status: "FAKE" });
  } else {
    scores.push({ source: "Metadata Analysis", score: 35, weight: 0.10, status: "REAL" });
  }

  // Calculate weighted score
  let weightedScore = 0;
  let totalWeight = 0;
  for (const s of scores) {
    weightedScore += s.score * s.weight;
    totalWeight += s.weight;
  }
  weightedScore = totalWeight > 0 ? weightedScore / totalWeight : 50;

  const fakeScore = Math.round(weightedScore);
  const realScore = 100 - fakeScore;

  // ── Determine status ──────────────────────────────────────────────
  let status;
  let confidence;

  if (fakeScore >= 70) {
    status = "FAKE";
    confidence = mapConfidence("FAKE", fakeScore);
  } else if (realScore >= 70) {
    status = "REAL";
    confidence = mapConfidence("REAL", realScore);
  } else {
    status = "UNCERTAIN";
    confidence = mapConfidence("UNCERTAIN", Math.max(fakeScore, realScore));
  }

  // Adjust based on EXIF presence
  if (status === "UNCERTAIN" && metadata.hasExif === false) {
    confidence = Math.max(50, Math.min(69, confidence));
  }

  const { trustScore, riskLevel, reliability } = calculateTrustScore({
    mlConfidence: confidence,
    mlPredictionReal: status === "REAL",
    factCheckScore: 50,
    factCheckFound: false,
    datasetScore: 50,
    datasetLabel: null,
    externalScore: 50,
  });

  // ── Build explanation ─────────────────────────────────────────────
  let explanation;
  if (status === "REAL") {
    explanation = `The image appears authentic. Combined analysis found ${fakeScore}% probability of manipulation, which is below the threshold for concern. ${cnnResult ? `CNN model (${cnnResult.modelType}) confidence: ${cnnResult.confidence}%.` : ""}`;
  } else if (status === "FAKE") {
    explanation = `The image shows strong indicators of manipulation or AI generation. Combined analysis detected ${fakeScore}% probability of artificial content. ${cnnResult ? `CNN model (${cnnResult.modelType}) flagged this image.` : ""}`;
  } else {
    explanation = `The analysis produced inconclusive results. The image has a ${fakeScore}% manipulation risk score, which falls in the uncertain range. Manual inspection is recommended.`;
  }

  // ── Build manipulated regions ─────────────────────────────────────
  const manipulatedRegions = [
    ...(cnnResult?.manipulatedRegions || []),
    ...(elaResult?.manipulatedRegions || []),
    ...(noiseResult?.manipulatedRegions || []),
  ];

  // ── Build heatmap ─────────────────────────────────────────────────
  const heatmapUrl = cnnResult?.heatmapUrl || elaResult?.heatmapUrl || null;

  const key_points = [
    ...(cnnResult ? [`CNN Model (${cnnResult.modelType}): ${cnnResult.status} @ ${cnnResult.confidence}%`] : []),
    ...(forensicResult && !forensicResult.error ? [`Forensic Ensemble: ${forensicResult.status} @ ${forensicResult.confidence}%`] : []),
    ...(seRisk ? [`Sightengine AI-generated: ${seRisk.aiGeneratedProb !== null ? Math.round(seRisk.aiGeneratedProb * 100) + "%" : "N/A"}`] : []),
    ...(seRisk ? [`Sightengine Deepfake: ${seRisk.deepfakeProb !== null ? Math.round(seRisk.deepfakeProb * 100) + "%" : "N/A"}`] : []),
    `ELA score: ${elaResult?.elaScore || 0}%`,
    `Noise uniformity: ${noiseResult?.isUniformNoise !== false ? "Uniform (suspicious)" : "Non-uniform (normal)"}`,
    ...metadata.points,
    `Manipulated regions detected: ${manipulatedRegions.length}`,
    `Trust Score: ${trustScore}/100`,
  ];

  const sources_checked = [
    "Local CNN Model (EfficientNetB0)",
    "Trained Forensic Ensemble (LR+RF+GB)",
    "Sightengine AI Generation Detection",
    "Sightengine Deepfake Detection",
    "Image Metadata Analysis (EXIF/Format)",
    "Error Level Analysis (ELA)",
    "Noise Pattern Analysis",
  ];

  return formatImageResponse({
    status,
    confidence: `${confidence}%`,
    explanation,
    key_points,
    sources_checked,
    trust_score: trustScore,
    processing_time_ms: Date.now() - startTime,
    manipulatedRegions,
    heatmapUrl,
    modelDetails: {
      cnnModel: cnnResult?.modelType || null,
      cnnConfidence: cnnResult?.confidence || null,
      sightengineRisk: seRisk,
      elaScore: elaResult?.elaScore || 0,
      noiseLevel: noiseResult?.noiseLevel || 0,
      noiseUniformity: noiseResult?.noiseUniformity || 0,
    },
  });
}

module.exports = { analyzeImage };