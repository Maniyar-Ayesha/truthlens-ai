/**
 * TruthLens AI – Trust Score Calculator (Upgraded)
 *
 * Computes a weighted 0–100 trust score from multiple pipeline signals.
 * Supports all detection types: news, image, video, URL.
 *
 * News weights:
 *   - ML Model confidence       (30%)
 *   - Google Fact Check results (25%)
 *   - Dataset similarity match  (20%)
 *   - Semantic similarity       (10%)
 *   - External verification      (15%)
 *
 * Image/Video weights:
 *   - CNN Model confidence      (30%)
 *   - Sightengine/API score     (25%)
 *   - ELA score                 (15%)
 *   - Noise analysis            (10%)
 *   - Temporal consistency      (20%)
 *
 * URL weights:
 *   - URL structure analysis    (30%)
 *   - ML model classification   (25%)
 *   - Google Safe Browsing      (20%)
 *   - WHOIS domain age          (15%)
 *   - SSL verification          (10%)
 */

function calculateTrustScore(signals = {}) {
  const {
    mlConfidence = 50,
    mlPredictionReal = true,
    factCheckScore = 50,
    factCheckFound = false,
    datasetScore = 50,
    datasetLabel = null,
    externalScore = 50,
    semanticScore = 50,
    cnnScore = null,
    sightengineScore = null,
    elaScore = null,
    noiseScore = null,
    temporalConsistency = 0.5,
    lipSyncScore = 50,
    urlStructureScore = null,
    mlModelScore = null,
    safeBrowsingSafe = true,
    whoisRiskFlag = false,
    sslValid = true,
    contentRiskScore = 0,
  } = signals;

  // ── News-specific calculation ──────────────────────────────
  if (factCheckFound || datasetLabel || semanticScore > 50) {
    const mlFactor = typeof mlConfidence === "number" ? mlConfidence : 50;
    const fcFactor = factCheckFound ? factCheckScore : 50;
    const dsFactor = datasetLabel === "REAL"
      ? Math.min(100, 50 + datasetScore * 0.5)
      : datasetLabel === "FAKE"
      ? Math.max(0, 50 - datasetScore * 0.5)
      : 50;
    const semanticFactor = semanticScore;
    const externalFactor = externalScore;

    const raw = mlFactor * 0.30 + fcFactor * 0.25 + dsFactor * 0.20 + semanticFactor * 0.10 + externalFactor * 0.15;
    const trustScore = Math.round(Math.min(100, Math.max(0, raw)));

    return {
      trustScore,
      riskLevel: trustScore >= 70 ? "LOW" : trustScore >= 40 ? "MEDIUM" : "HIGH",
      reliability: trustScore >= 70 ? "HIGH" : trustScore >= 40 ? "MEDIUM" : "LOW",
      breakdown: { ml: mlFactor, factCheck: fcFactor, dataset: dsFactor, semantic: semanticFactor, external: externalFactor },
    };
  }

  // ── Image/Video-specific calculation ───────────────────────
  if (cnnScore !== null || sightengineScore !== null || elaScore !== null) {
    const cnnFactor = cnnScore !== null ? (100 - cnnScore) : 50;
    const seFactor = sightengineScore !== null ? (100 - sightengineScore) : 50;
    const elaFactor = elaScore !== null ? (100 - elaScore) : 50;
    const noiseFactor = noiseScore !== null ? (100 - noiseScore) : 50;
    const temporalFactor = temporalConsistency * 100;
    const lipSyncFactor = lipSyncScore;

    const raw = cnnFactor * 0.30 + seFactor * 0.25 + elaFactor * 0.15 + noiseFactor * 0.10 + temporalFactor * 0.10 + lipSyncFactor * 0.10;
    const trustScore = Math.round(Math.min(100, Math.max(0, raw)));

    return {
      trustScore,
      riskLevel: trustScore >= 70 ? "LOW" : trustScore >= 40 ? "MEDIUM" : "HIGH",
      reliability: trustScore >= 70 ? "HIGH" : trustScore >= 40 ? "MEDIUM" : "LOW",
      breakdown: { cnn: cnnFactor, sightengine: seFactor, ela: elaFactor, noise: noiseFactor, temporal: temporalFactor, lipSync: lipSyncFactor },
    };
  }

  // ── URL-specific calculation ───────────────────────────────
  if (urlStructureScore !== null || mlModelScore !== null) {
    const urlFactor = urlStructureScore !== null ? urlStructureScore : 50;
    const mlFactor = mlModelScore !== null ? (100 - mlModelScore) : 50;
    const sbFactor = safeBrowsingSafe ? 100 : 0;
    const whoisFactor = whoisRiskFlag ? 30 : 70;
    const sslFactor = sslValid ? 100 : 40;
    const contentFactor = Math.max(0, 100 - contentRiskScore);

    const raw = urlFactor * 0.30 + mlFactor * 0.25 + sbFactor * 0.20 + whoisFactor * 0.15 + sslFactor * 0.10;
    const trustScore = Math.round(Math.min(100, Math.max(0, raw)));

    return {
      trustScore,
      riskLevel: trustScore >= 70 ? "LOW" : trustScore >= 40 ? "MEDIUM" : "HIGH",
      reliability: trustScore >= 70 ? "HIGH" : trustScore >= 40 ? "MEDIUM" : "LOW",
      breakdown: { urlStructure: urlFactor, mlModel: mlFactor, safeBrowsing: sbFactor, whois: whoisFactor, ssl: sslFactor, content: contentFactor },
    };
  }

  // ── Fallback: simple calculation ───────────────────────────
  const mlFactor = mlPredictionReal ? mlConfidence : 100 - mlConfidence;
  const trustScore = Math.round(Math.min(100, Math.max(0, mlFactor)));

  return {
    trustScore,
    riskLevel: trustScore >= 70 ? "LOW" : trustScore >= 40 ? "MEDIUM" : "HIGH",
    reliability: trustScore >= 70 ? "HIGH" : trustScore >= 40 ? "MEDIUM" : "LOW",
    breakdown: { ml: mlFactor },
  };
}

function calculateSimpleTrustScore(score) {
  const trustScore = Math.round(Math.min(100, Math.max(0, score)));
  const riskLevel = trustScore >= 70 ? "LOW" : trustScore >= 40 ? "MEDIUM" : "HIGH";
  const reliability = trustScore >= 70 ? "HIGH" : trustScore >= 40 ? "MEDIUM" : "LOW";
  return { trustScore, riskLevel, reliability };
}

module.exports = { calculateTrustScore, calculateSimpleTrustScore };