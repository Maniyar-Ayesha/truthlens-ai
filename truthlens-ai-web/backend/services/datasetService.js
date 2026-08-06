/**
 * TruthLens AI – Dataset Similarity Service (Upgraded)
 * Node.js wrapper that calls dataset_search.py and semantic_search.py
 * Returns top-N similar articles from Fake.csv / True.csv
 */

const path = require("path");
const { runMLScript } = require("../utils/pythonRunner");
const { runAIScript } = require("../utils/pythonRunner");
const logger = require("../utils/logger");

const SCRIPT_DIR = path.join(__dirname, "..", "ml");
const AI_DIR = path.join(__dirname, "..", "ai");

const DATASET_SCRIPT = "dataset_search.py";
const SEMANTIC_SCRIPT = "semantic_search.py";

/**
 * Search both Fake.csv and True.csv for similar articles using TF-IDF cosine similarity.
 * @param {string} text Input news text
 * @param {number} topN Number of results to return (default 5)
 * @returns {Promise<Array>} Array of { title, label, similarity, snippet }
 */
async function searchDataset(text, topN = 5) {
  try {
    const safeText = String(text).slice(0, 1000);
    const result = await runMLScript(DATASET_SCRIPT, [safeText, String(topN)], 90000);

    if (Array.isArray(result)) {
      return result;
    }

    if (result && result.matches) {
      return result.matches;
    }

    logger.warn("DatasetService", "Unexpected result format from dataset_search.py", result);
    return [];
  } catch (error) {
    logger.warn("DatasetService", `Dataset search failed (non-fatal): ${error.message}`);
    return [];
  }
}

/**
 * Semantic similarity search using sentence embeddings.
 * @param {string} text Input news text
 * @param {number} topN Number of results to return (default 5)
 * @returns {Promise<Array>} Array of { title, source, label, similarity, snippet }
 */
async function semanticSearch(text, topN = 5) {
  try {
    const safeText = String(text).slice(0, 1000);
    const result = await runAIScript(SEMANTIC_SCRIPT, [safeText, String(topN)], 90000);

    if (Array.isArray(result)) {
      return result;
    }

    if (result && result.matches) {
      return result.matches;
    }

    logger.warn("DatasetService", "Unexpected result format from semantic_search.py", result);
    return [];
  } catch (error) {
    logger.warn("DatasetService", `Semantic search failed (non-fatal): ${error.message}`);
    return [];
  }
}

/**
 * Determine the best label from dataset matches.
 * Returns { label: "REAL"|"FAKE"|null, score: 0-100 }
 */
function getBestDatasetSignal(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { label: null, score: 50 };
  }

  let fakeWeight = 0;
  let realWeight = 0;

  for (const m of matches) {
    const sim = m.similarity || 0;
    if (m.label === "FAKE") fakeWeight += sim;
    else if (m.label === "REAL") realWeight += sim;
  }

  if (fakeWeight === 0 && realWeight === 0) {
    return { label: null, score: 50 };
  }

  const total = fakeWeight + realWeight;
  const label = fakeWeight > realWeight ? "FAKE" : "REAL";
  const score = label === "REAL"
    ? Math.round((realWeight / total) * 100)
    : Math.round((fakeWeight / total) * 100);

  return { label, score };
}

module.exports = { searchDataset, semanticSearch, getBestDatasetSignal };