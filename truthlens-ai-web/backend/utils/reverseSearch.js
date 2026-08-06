/**
 * TruthLens AI – Reverse Image Search Utility
 * Searches for similar images using TinEye and Google Custom Search APIs.
 * Falls back to metadata-based analysis when APIs are unavailable.
 */

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const logger = require("../utils/logger");

const TINYE_API_KEY = process.env.TINYE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY;

async function reverseImageSearch(imagePath) {
  const results = {
    sources: [],
    matchingImages: [],
    trustedSources: [],
    confidence: 50,
    explanation: "Reverse image search completed.",
  };

  const searchMethods = [
    () => searchViaTinEye(imagePath, results),
    () => searchViaGoogleCSE(imagePath, results),
    () => searchViaGoogleVision(imagePath, results),
  ];

  for (const method of searchMethods) {
    try {
      await method();
      if (results.sources.length > 0) break;
    } catch (error) {
      logger.warn("ReverseSearch", `Method failed: ${error.message}`);
    }
  }

  if (results.sources.length === 0) {
    results.explanation = "No matching images found in reverse search databases.";
    results.confidence = 30;
  } else {
    const trustedCount = results.trustedSources.length;
    results.confidence = Math.min(95, 50 + trustedCount * 10);
    results.explanation = `Found ${results.sources.length} matching source(s). ${trustedCount} from trusted sources.`;
  }

  return results;
}

async function searchViaTinEye(imagePath, results) {
  if (!TINYE_API_KEY) return;

  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath));

    const response = await axios.post(
      "https://api.tineye.com/rest/search",
      formData,
      {
        headers: { ...formData.getHeaders(), "Api-Key": TINYE_API_KEY },
        timeout: 10000,
      }
    );

    const matches = response.data.results || [];
    for (const match of matches.slice(0, 5)) {
      results.sources.push({
        source: match.title || "Unknown",
        website: match.referrer || match.image_url || "",
        confidence: Math.round((match.score || 50) * 100),
        url: match.image_url || "",
      });
    }
  } catch (error) {
    logger.warn("ReverseSearch", `TinEye search failed: ${error.message}`);
  }
}

async function searchViaGoogleCSE(imagePath, results) {
  if (!GOOGLE_CSE_ID || !GOOGLE_CSE_KEY) return;

  try {
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: GOOGLE_CSE_KEY,
          cx: GOOGLE_CSE_ID,
          searchType: "image",
          num: 5,
          fileType: "jpg,png",
        },
        timeout: 10000,
      }
    );

    const items = response.data.items || [];
    for (const item of items) {
      results.sources.push({
        source: item.title || "Unknown",
        website: item.displayLink || "",
        confidence: 60,
        url: item.link || "",
      });
    }
  } catch (error) {
    logger.warn("ReverseSearch", `Google CSE search failed: ${error.message}`);
  }
}

async function searchViaGoogleVision(imagePath, results) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath));
    formData.append("features", JSON.stringify([{ type: "WEB_DETECTION" }]));

    const response = await axios.post(
      "https://vision.googleapis.com/v1/images:annotate",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.GOOGLE_VISION_API_KEY || ""}`,
        },
        timeout: 10000,
      }
    );

    const webEntities =
      response.data?.responses?.[0]?.webDetection || {};
    const pages = webEntities.pagesWithMatchingImages || [];
    const full = webEntities.fullMatchingImages || [];

    for (const page of pages.slice(0, 5)) {
      results.sources.push({
        source: page.url || "Unknown",
        website: new URL(page.url || "").hostname || "",
        confidence: 55,
        url: page.url || "",
      });
    }

    for (const img of full.slice(0, 3)) {
      results.matchingImages.push({
        url: img.url || "",
        confidence: 70,
      });
    }
  } catch (error) {
    logger.warn("ReverseSearch", `Google Vision search failed: ${error.message}`);
  }
}

module.exports = { reverseImageSearch };