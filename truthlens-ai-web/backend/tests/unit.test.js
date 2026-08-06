/**
 * TruthLens AI – Unit & Integration Tests
 * Run: npm test
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const { mapConfidence, statusAndConfidenceFromRealProb } = require("../utils/confidenceMapper");
const {
  normalizeStatus,
  formatConfidence,
  formatNewsResponse,
  formatImageResponse,
  formatVideoResponse,
  formatUrlResponse,
} = require("../utils/responseFormatter");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error.message}`);
  }
}

console.log("\n=== Confidence Mapper ===");
test("REAL confidence in 85–99", () => {
  const c = mapConfidence("REAL", 90);
  assert.ok(c >= 85 && c <= 99, `got ${c}`);
});
test("FAKE confidence in 10–35", () => {
  const c = mapConfidence("FAKE", 90);
  assert.ok(c >= 10 && c <= 35, `got ${c}`);
});
test("UNCERTAIN confidence in 50–69", () => {
  const c = mapConfidence("UNCERTAIN", 55);
  assert.ok(c >= 50 && c <= 69, `got ${c}`);
});
test("statusAndConfidenceFromRealProb high → REAL", () => {
  const r = statusAndConfidenceFromRealProb(85);
  assert.strictEqual(r.status, "REAL");
  assert.ok(r.confidence >= 85);
});
test("statusAndConfidenceFromRealProb low → FAKE", () => {
  const r = statusAndConfidenceFromRealProb(15);
  assert.strictEqual(r.status, "FAKE");
  assert.ok(r.confidence <= 35);
});

console.log("\n=== Response Formatter ===");
test("normalizeStatus maps SAFE→REAL", () => {
  assert.strictEqual(normalizeStatus("SAFE"), "REAL");
});
test("formatConfidence adds percent", () => {
  assert.strictEqual(formatConfidence(87), "87%");
});
test("formatNewsResponse shape", () => {
  const r = formatNewsResponse({ status: "REAL", confidence: 90, explanation: "ok" });
  assert.strictEqual(r.status, "REAL");
  assert.ok(r.confidence.includes("%"));
  assert.ok(Array.isArray(r.key_points));
});
test("formatVideoResponse includes status + key_points", () => {
  const r = formatVideoResponse({ prediction: "FAKE", confidence: "25%", keyFindings: ["a"] });
  assert.strictEqual(r.status, "FAKE");
  assert.strictEqual(r.prediction, "FAKE");
  assert.deepStrictEqual(r.key_points, ["a"]);
});
test("formatImageResponse and formatUrlResponse", () => {
  const img = formatImageResponse({ status: "UNCERTAIN", confidence: 60 });
  const url = formatUrlResponse({ status: "SAFE", confidence: 90, checked_url: "https://bbc.com" });
  assert.strictEqual(img.status, "UNCERTAIN");
  assert.strictEqual(url.status, "REAL");
  assert.strictEqual(url.checked_url, "https://bbc.com");
});

console.log("\n=== Model Files ===");
test("news models exist", () => {
  const newsDir = path.join(__dirname, "..", "ml", "news");
  ["news_model.pkl", "news_model_rf.pkl", "news_model_nb.pkl", "vectorizer.pkl"].forEach((f) => {
    assert.ok(fs.existsSync(path.join(newsDir, f)), `missing ${f}`);
  });
});
test("url models exist", () => {
  const ml = path.join(__dirname, "..", "ml");
  assert.ok(fs.existsSync(path.join(ml, "url_model.pkl")));
  assert.ok(fs.existsSync(path.join(ml, "url_vectorizer.pkl")));
});
test("video models exist", () => {
  const videoDir = path.join(__dirname, "..", "ml", "video");
  ["frame_classifier.pt", "temporal_model.pt", "lip_sync_model.pt"].forEach((f) => {
    assert.ok(fs.existsSync(path.join(videoDir, f)), `missing ${f}`);
  });
});
test("image forensic model exists", () => {
  const imgDir = path.join(__dirname, "..", "ml", "image");
  assert.ok(fs.existsSync(path.join(imgDir, "forensic_model.pkl")));
  assert.ok(fs.existsSync(path.join(imgDir, "forensic_scaler.pkl")));
});
test("datasets exist", () => {
  const ds = path.join(__dirname, "..", "Dataset");
  assert.ok(fs.existsSync(path.join(ds, "Fake.csv")));
  assert.ok(fs.existsSync(path.join(ds, "True.csv")));
});

console.log("\n=== Auth Service Exports ===");
test("authService exports required functions", () => {
  const auth = require("../services/authService");
  ["signup", "login", "googleLogin", "forgotPassword", "resetPassword", "updateProfile", "getProfile", "generateToken"].forEach((k) => {
    assert.strictEqual(typeof auth[k], "function", `missing ${k}`);
  });
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
