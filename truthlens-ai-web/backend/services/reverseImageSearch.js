/**
 * TruthLens AI – Reverse Image Search Service
 * Performs reverse image search to find similar images and trusted sources.
 */

const { reverseImageSearch } = require("../utils/reverseSearch");
const { calculateSimpleTrustScore } = require("../utils/trustScore");
const { formatImageResponse } = require("../utils/responseFormatter");
const logger = require("../utils/logger");

async function performReverseSearch(imagePath) {
  const startTime = Date.now();

  try {
    const searchResults = await reverseImageSearch(imagePath);

    const sources = searchResults.sources || [];
    const matchingImages = searchResults.matchingImages || [];
    const trustedSources = sources.filter(
      (s) =>
        s.confidence >= 60 ||
        isTrustedSource(s.website)
    );

    const avgConfidence =
      sources.length > 0
        ? Math.round(
            sources.reduce((sum, s) => sum + (s.confidence || 50), 0) /
              sources.length
          )
        : 50;

    const { trustScore } = calculateSimpleTrustScore(avgConfidence);

    const explanation =
      sources.length > 0
        ? `Found ${sources.length} matching source(s) across the web. ${trustedSources.length} from trusted domains. ${searchResults.explanation || ""}`
        : "No matching images found in reverse search databases. The image may be original or not indexed.";

    const key_points = [
      ...sources.map(
        (s) => `Source: ${s.source} (${s.confidence}% match)`
      ),
      ...matchingImages.map(
        (img) => `Matching image found: ${img.url || "Unknown"} (${img.confidence || 50}% confidence)`
      ),
      `Trusted sources: ${trustedSources.length}`,
      `Overall confidence: ${avgConfidence}%`,
      `Trust Score: ${trustScore}/100`,
    ];

    const sources_checked = [
      "TinEye Reverse Image Search",
      "Google Custom Search",
      "Google Vision API Web Detection",
    ];

    return formatImageResponse({
      status: sources.length > 0 ? "REAL" : "UNCERTAIN",
      confidence: `${avgConfidence}%`,
      explanation,
      key_points,
      sources_checked,
      trust_score: trustScore,
      processing_time_ms: Date.now() - startTime,
      reverseSearch: {
        sources,
        matchingImages,
        trustedSources,
      },
    });
  } catch (error) {
    logger.error("ReverseImageSearch", `Reverse search failed: ${error.message}`);
    return formatImageResponse({
      status: "UNCERTAIN",
      confidence: "0%",
      explanation: "Reverse image search could not be completed.",
      key_points: ["Reverse search service unavailable."],
      sources_checked: [],
      trust_score: null,
      processing_time_ms: Date.now() - startTime,
    });
  }
}

function isTrustedSource(website) {
  if (!website) return false;
  const trustedDomains = [
    "google.com",
    "bing.com",
    "yandex.com",
    "tineye.com",
    "wikipedia.org",
    "bbc.com",
    "reuters.com",
    "apnews.com",
    "nytimes.com",
    "theguardian.com",
    "cnn.com",
  ];
  const hostname = website.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  return trustedDomains.some(
    (domain) => hostname === domain || hostname.endsWith("." + domain)
  );
}

module.exports = { performReverseSearch };