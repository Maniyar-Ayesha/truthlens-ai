/**
 * TruthLens AI – Confidence Mapping Utility
 * Maps model probabilities into display ranges:
 *   REAL      → 85–99%
 *   FAKE      → 10–35%
 *   UNCERTAIN → 50–69%
 * Never uses random values.
 */

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {"REAL"|"FAKE"|"UNCERTAIN"} status
 * @param {number} rawScore 0–100 confidence/probability from models
 * @returns {number} mapped confidence in the required range
 */
function mapConfidence(status, rawScore) {
  const score = Number.isFinite(Number(rawScore)) ? Number(rawScore) : 50;
  const s = String(status || "UNCERTAIN").toUpperCase();

  if (s === "REAL" || s === "SAFE" || s === "TRUE") {
    // Map 50–100 raw → 85–99
    const t = clamp((score - 50) / 50, 0, 1);
    return Math.round(85 + t * 14);
  }

  if (s === "FAKE" || s === "UNSAFE" || s === "FALSE") {
    // Map 50–100 fake intensity → 10–35
    const intensity = score >= 50 ? score : 100 - score;
    const t = clamp((intensity - 50) / 50, 0, 1);
    return Math.round(10 + t * 25);
  }

  // UNCERTAIN → 50–69 based on how close to 50 the score is
  const distance = Math.abs(score - 50);
  const t = clamp(distance / 20, 0, 1);
  return Math.round(50 + t * 19);
}

/**
 * Derive status from a real-probability (0–100) then map confidence.
 */
function statusAndConfidenceFromRealProb(realProb) {
  const p = clamp(Number(realProb) || 50, 0, 100);
  let status = "UNCERTAIN";
  if (p >= 70) status = "REAL";
  else if (p <= 30) status = "FAKE";
  const confidence = mapConfidence(status, status === "FAKE" ? 100 - p : p);
  return { status, confidence };
}

module.exports = { mapConfidence, statusAndConfidenceFromRealProb, clamp };
