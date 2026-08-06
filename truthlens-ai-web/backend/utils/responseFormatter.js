/**
 * TruthLens AI – Response Formatter (Upgraded)
 *
 * Normalizes all detection pipeline outputs into a consistent shape
 * that is 100% backward compatible with the existing frontend contract:
 *   { status, confidence, explanation, key_points[], sources_checked[] }
 *
 * Additional fields are appended for richer future use.
 */

function normalizeStatus(raw) {
  const s = String(raw || "").toUpperCase().trim();
  const map = {
    REAL: "REAL",
    TRUE: "REAL",
    SAFE: "REAL",
    FAKE: "FAKE",
    FALSE: "FAKE",
    UNSAFE: "FAKE",
    "PARTIALLY TRUE": "PARTIALLY TRUE",
    MISLEADING: "MISLEADING",
    SUSPICIOUS: "SUSPICIOUS",
    UNCERTAIN: "UNCERTAIN",
    UNKNOWN: "UNKNOWN",
  };
  return map[s] || "UNCERTAIN";
}

function formatConfidence(value) {
  if (typeof value === "string" && value.includes("%")) return value;
  const n = parseFloat(value);
  if (isNaN(n)) return "50%";
  return `${Math.round(Math.min(100, Math.max(0, n)))}%`;
}

function formatNewsResponse({
  status,
  confidence,
  explanation,
  key_points = [],
  sources_checked = [],
  trust_score,
  fact_check_results = [],
  dataset_matches = [],
  processing_time_ms,
  gnews_articles = [],
  semantic_matches = [],
  ml_details = null,
  ensembleVotes = null,
  top5SimilarNews = [],
  googleFactCheck = [],
} = {}) {
  return {
    status: normalizeStatus(status),
    confidence: formatConfidence(confidence),
    explanation: explanation || "Analysis complete.",
    key_points: Array.isArray(key_points) ? key_points : [],
    sources_checked: Array.isArray(sources_checked) ? sources_checked : [],
    trust_score: trust_score ?? null,
    fact_check_results: fact_check_results,
    dataset_matches: dataset_matches,
    gnews_articles: gnews_articles || [],
    semantic_matches: semantic_matches || [],
    processing_time_ms: processing_time_ms ?? null,
    ml_details: ml_details,
    ensembleVotes,
    top5SimilarNews,
    googleFactCheck,
  };
}

function formatImageResponse({
  status,
  confidence,
  explanation,
  key_points = [],
  sources_checked = [],
  trust_score,
  processing_time_ms,
  manipulatedRegions = [],
  heatmapUrl = null,
  modelDetails = null,
} = {}) {
  return {
    status: normalizeStatus(status),
    confidence: formatConfidence(confidence),
    explanation: explanation || "Image analysis complete.",
    key_points: Array.isArray(key_points) ? key_points : [],
    sources_checked: Array.isArray(sources_checked) ? sources_checked : [],
    trust_score: trust_score ?? null,
    processing_time_ms: processing_time_ms ?? null,
    manipulated_regions: manipulatedRegions,
    heatmap_url: heatmapUrl,
    model_details: modelDetails,
  };
}

function formatVideoResponse({
  prediction,
  accuracy,
  explanation,
  keyFindings = [],
  confidence,
  model,
  processingTime,
  confidenceBreakdown,
  isVideo,
  status,
  frameResults = [],
  temporalAnalysis = null,
  lipSyncAnalysis = null,
} = {}) {
  const finalStatus = normalizeStatus(status || prediction);
  const finalConfidence = formatConfidence(confidence || accuracy);
  return {
    status: finalStatus,
    prediction: finalStatus,
    confidence: finalConfidence,
    accuracy: finalConfidence,
    explanation: explanation || "Video analysis complete.",
    key_points: Array.isArray(keyFindings) ? keyFindings : [],
    keyFindings: Array.isArray(keyFindings) ? keyFindings : [],
    sources_checked: ["Frame CNN Classifier", "Temporal Consistency Model", "Lip Sync Model"],
    model,
    processingTime,
    confidenceBreakdown,
    isVideo: isVideo !== false,
    frame_results: frameResults,
    temporal_analysis: temporalAnalysis,
    lip_sync_analysis: lipSyncAnalysis,
  };
}

function formatUrlResponse({
  status,
  confidence,
  explanation,
  key_points = [],
  sources_checked = [],
  trust_score,
  domain_age,
  ssl_status,
  blacklist_status,
  checked_url,
  processing_time_ms,
  ml_details = null,
  content_analysis = null,
} = {}) {
  return {
    status: normalizeStatus(status),
    confidence: formatConfidence(confidence),
    explanation: explanation || "URL analysis complete.",
    key_points: Array.isArray(key_points) ? key_points : [],
    sources_checked: Array.isArray(sources_checked) ? sources_checked : [],
    trust_score: trust_score ?? null,
    domain_age: domain_age ?? null,
    ssl_status: ssl_status ?? null,
    blacklist_status: blacklist_status ?? null,
    checked_url: checked_url ?? null,
    processing_time_ms: processing_time_ms ?? null,
    ml_details: ml_details,
    content_analysis: content_analysis,
  };
}

function formatReverseImageResponse({
  sources = [],
  matchingImages = [],
  trustedSources = [],
  confidence,
  explanation,
  key_points = [],
  sources_checked = [],
  trust_score,
  processing_time_ms,
} = {}) {
  return {
    status: "REAL",
    confidence: formatConfidence(confidence),
    explanation: explanation || "Reverse image search complete.",
    key_points: Array.isArray(key_points) ? key_points : [],
    sources_checked: Array.isArray(sources_checked) ? sources_checked : [],
    trust_score: trust_score ?? null,
    processing_time_ms: processing_time_ms ?? null,
    reverse_search: {
      sources,
      matching_images: matchingImages,
      trusted_sources: trustedSources,
    },
  };
}

module.exports = {
  normalizeStatus,
  formatConfidence,
  formatNewsResponse,
  formatImageResponse,
  formatVideoResponse,
  formatUrlResponse,
  formatReverseImageResponse,
};