require("dotenv").config();
const { analyzeUrl } = require("./services/urlService");

const validUrls = [
  "https://www.bbc.com",
  "https://bbc.com",
  "https://www.google.com",
  "https://openai.com",
  "https://github.com",
  "https://amazon.in",
  "https://www.wikipedia.org",
  "https://timesofindia.indiatimes.com",
  "google.com",
  "bbc.com",
  "github.com",
];

const invalidUrls = [
  "adw.akw",
  "hello",
  "randomtext",
  "asdf.asdf",
  "http://",
  "[www](http://www).",
  "abc.xyz123",
  "fake",
  "qwerty",
  "google",
  "test",
];

async function runTests() {
  console.log("===============================================================================");
  console.log("         TRUTHLENS AI — AUTOMATED URL DETECTION PIPELINE TEST");
  console.log("===============================================================================\n");

  console.log("--- VALID URL TESTS ---");
  let validPass = 0;
  let validFail = 0;

  for (const url of validUrls) {
    try {
      const res = await analyzeUrl(url);
      const isReal = res.status === "REAL";
      const confNum = parseFloat(res.confidence.replace("%", ""));
      const inRange = confNum >= 85 && confNum <= 99;
      const pass = isReal && inRange;

      if (pass) {
        validPass++;
      } else {
        validFail++;
      }

      console.log(
        `[VALID] ${url.padEnd(40)} → ${res.status.padEnd(10)} ${res.confidence.padStart(6)} ${pass ? "PASS" : "FAIL"}`
      );
      console.log(`         Explanation: ${res.explanation}`);
    } catch (error) {
      console.log(`[VALID] ${url.padEnd(40)} → ERROR: ${error.message}`);
      validFail++;
    }
  }

  console.log("\n--- INVALID URL TESTS ---");
  let invalidPass = 0;
  let invalidFail = 0;

  for (const url of invalidUrls) {
    try {
      const res = await analyzeUrl(url);
      const isFake = res.status === "FAKE";
      const confNum = parseFloat(res.confidence.replace("%", ""));
      const inRange = confNum >= 10 && confNum <= 35;
      const pass = isFake && inRange;

      if (pass) {
        invalidPass++;
      } else {
        invalidFail++;
      }

      console.log(
        `[INVALID] ${url.padEnd(40)} → ${res.status.padEnd(10)} ${res.confidence.padStart(6)} ${pass ? "PASS" : "FAIL"}`
      );
      console.log(`          Explanation: ${res.explanation}`);
    } catch (error) {
      console.log(`[INVALID] ${url.padEnd(40)} → ERROR: ${error.message}`);
      invalidFail++;
    }
  }

  console.log("\n===============================================================================");
  console.log("                             TEST SUMMARY REPORT");
  console.log("===============================================================================");
  console.log(`Valid URLs Tested    : ${validUrls.length}`);
  console.log(`Valid URLs PASS      : ${validPass}`);
  console.log(`Valid URLs FAIL      : ${validFail}`);
  console.log(`Invalid URLs Tested  : ${invalidUrls.length}`);
  console.log(`Invalid URLs PASS    : ${invalidPass}`);
  console.log(`Invalid URLs FAIL    : ${invalidFail}`);

  const allPass = validPass === validUrls.length && invalidPass === invalidUrls.length;
  console.log(`\nOverall: ${allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  console.log("===============================================================================");

  if (!allPass) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });