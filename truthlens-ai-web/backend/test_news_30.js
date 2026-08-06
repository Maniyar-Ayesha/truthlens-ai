require("dotenv").config();
const { analyzeNews } = require("./services/newsService");

const realHeadlines = [
  "U.S. Federal Reserve maintains benchmark interest rate following inflation data",
  "NASA Artemis mission team prepares SLS rocket for upcoming lunar orbital test",
  "World Health Organization releases updated guidelines for seasonal flu vaccines",
  "European Union reaches agreement on new AI regulatory compliance framework",
  "United Nations climate summit concludes with commitments on renewable energy target",
  "Bank of England raises interest rates to combat rising consumer price index",
  "Scientists discover new species of deep sea coral off coast of Australia",
  "Global semiconductor supply chain shows signs of recovery after recent bottlenecks",
  "International Energy Agency projects record solar power adoption in 2026",
  "Olympic committee confirms host cities for future summer and winter games",
  "Department of Transportation issues new safety standards for commercial aviation",
  "Cancer research study shows promising results in early stage clinical trial",
  "Treasury Department issues new guidelines for international financial reporting",
  "Federal Reserve chair signals potential rate cut at next FOMC meeting",
  "New study published in Nature reveals breakthrough in quantum computing error correction",
];

const fakeHeadlines = [
  "Secret alien base found under Antarctic ice sheet according to leaked military document",
  "Drinking boiled lemon water completely cures diabetes and high blood pressure overnight",
  "Famous celebrity secretly replaced by clone after sudden public appearance anomaly",
  "Government introducing mandatory microchips embedded in currency bills next month",
  "NASA admits moon landing was filmed in Hollywood studio in confidential video leak",
  "Scientists confirm earth core has stopped spinning and will reverse gravity soon",
  "Mysterious giant sea monster captured on sonar camera near Bermuda triangle",
  "5G towers proven to cause immediate memory loss in surrounding residents",
  "Billionaire secretly purchasing all fresh water springs to control world supply",
  "Ancient pyramid discovered under Sahara desert contains ancient alien technology",
  "Miracle plant discovered in Amazon jungle instantly repairs tooth enamel overnight",
  "Secret satellite launching tomorrow will control weather patterns worldwide",
  "Breaking news confidential documents reveal time travel experiment conducted in 1999",
  "Chemtrails confirmed to contain mind control chemicals sprayed by secret organization",
  "Volcanic eruption in Pacific will create new continent within next forty eight hours",
];

async function runTests() {
  console.log("===============================================================================");
  console.log("         TRUTHLENS AI — AUTOMATED NEWS DETECTION PIPELINE TEST (30 HEADLINES)");
  console.log("===============================================================================\n");

  const results = [];
  let realCount = 0;
  let fakeCount = 0;
  let uncertainCount = 0;
  const confidences = [];
  const realConfs = [];
  const fakeConfs = [];
  const uncConfs = [];
  const uniqueConfs = new Set();
  let correctPredictions = 0;

  const allHeadlines = [
    ...realHeadlines.map((h, i) => ({ text: h, expected: "REAL", idx: i + 1 })),
    ...fakeHeadlines.map((h, i) => ({ text: h, expected: "FAKE", idx: realHeadlines.length + i + 1 })),
  ];

  for (let i = 0; i < allHeadlines.length; i++) {
    const { text, expected, idx } = allHeadlines[i];
    try {
      const res = await analyzeNews(text);
      const confNum = parseFloat(res.confidence.replace("%", ""));
      confidences.push(confNum);
      uniqueConfs.add(confNum);

      if (res.status === "REAL") {
        realCount++;
        realConfs.push(confNum);
      } else if (res.status === "FAKE") {
        fakeCount++;
        fakeConfs.push(confNum);
      } else {
        uncertainCount++;
        uncConfs.push(confNum);
      }

      if (
        (expected === "REAL" && res.status === "REAL") ||
        (expected === "FAKE" && res.status === "FAKE")
      ) {
        correctPredictions++;
      }

      const indPreds = res.ml_details?.individualPredictions || [];
      const indConfs = res.ml_details?.individualConfidences || [];
      const indTypes = res.ml_details?.modelTypes || [];

      results.push({
        idx,
        headline: text.slice(0, 55) + (text.length > 55 ? "..." : ""),
        expected,
        status: res.status,
        confidence: res.confidence,
        ensembleVotes: res.ensembleVotes,
        individualPreds: indPreds.join(", "),
        individualConfs: indConfs,
        modelTypes: indTypes,
        top5SimilarNews: res.top5SimilarNews ? res.top5SimilarNews.length : 0,
        googleFactCheck: res.googleFactCheck ? res.googleFactCheck.length : 0,
      });

      console.log(
        `[${idx.toString().padStart(2, "0")}] Exp:${expected.padEnd(5)} | Got:${res.status.padEnd(5)} | Conf:${res.confidence.padStart(6)} | Models:[${indTypes.join("+") || "N/A"}] | Votes:[${indPreds.join(",") || "N/A"}] | IndConf:[${indConfs.join(",") || "N/A"}]`
      );
    } catch (error) {
      console.error(`[${idx}] FAILED: ${error.message}`);
    }
  }

  console.log("\n===============================================================================");
  console.log("                             TEST SUMMARY REPORT                               ");
  console.log("===============================================================================");
  console.log(`Total Headlines Tested : ${allHeadlines.length}`);
  console.log(`Classified as REAL     : ${realCount}`);
  console.log(`Classified as FAKE     : ${fakeCount}`);
  console.log(`Classified as UNCERTAIN: ${uncertainCount}`);
  console.log(`Unique Confidence Vals : ${uniqueConfs.size} / ${confidences.length}`);
  console.log(`Min Confidence         : ${Math.min(...confidences).toFixed(2)}%`);
  console.log(`Max Confidence         : ${Math.max(...confidences).toFixed(2)}%`);
  console.log(`Avg Confidence         : ${(confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)}%`);

  if (realConfs.length > 0) {
    console.log(`\nREAL predictions confidence range: ${Math.min(...realConfs).toFixed(2)}% - ${Math.max(...realConfs).toFixed(2)}%`);
    console.log(`  Expected range: 70% - 100%`);
    const realInRange = realConfs.every((c) => c >= 70 && c <= 100);
    console.log(`  All REAL confidences in [70, 100]: ${realInRange ? "PASS" : "FAIL"}`);
  }

  if (fakeConfs.length > 0) {
    console.log(`\nFAKE predictions confidence range: ${Math.min(...fakeConfs).toFixed(2)}% - ${Math.max(...fakeConfs).toFixed(2)}%`);
    console.log(`  Expected range: 0% - 49%`);
    const fakeInRange = fakeConfs.every((c) => c >= 0 && c <= 49);
    console.log(`  All FAKE confidences in [0, 49]: ${fakeInRange ? "PASS" : "FAIL"}`);
  }

  if (uncConfs.length > 0) {
    console.log(`\nUNCERTAIN predictions confidence range: ${Math.min(...uncConfs).toFixed(2)}% - ${Math.max(...uncConfs).toFixed(2)}%`);
    console.log(`  Expected range: 50% - 69%`);
    const uncInRange = uncConfs.every((c) => c >= 50 && c <= 69);
    console.log(`  All UNCERTAIN confidences in [50, 69]: ${uncInRange ? "PASS" : "FAIL"}`);
  }

  console.log(`\nConfidence variation check:`);
  console.log(`  Unique values: ${uniqueConfs.size} / ${confidences.length}`);
  console.log(`  Variation ratio: ${(uniqueConfs.size / confidences.length * 100).toFixed(1)}%`);

  console.log(`\nPrediction Accuracy: ${correctPredictions}/${allHeadlines.length} (${(correctPredictions / allHeadlines.length * 100).toFixed(1)}%)`);

  const confVariationPass = uniqueConfs.size > 5;
  const realRangePass = realConfs.length === 0 || realConfs.every((c) => c >= 70 && c <= 100);
  const fakeRangePass = fakeConfs.length === 0 || fakeConfs.every((c) => c >= 0 && c <= 49);
  const hasReal = realConfs.length > 0;
  const hasFake = fakeConfs.length > 0;

  console.log(`\n===============================================================================`);
  console.log(`  Confidence variation > 5 unique values: ${confVariationPass ? "PASS" : "FAIL"}`);
  console.log(`  REAL confidences in [70, 100]: ${realRangePass ? "PASS" : "FAIL"}`);
  console.log(`  FAKE confidences in [0, 49]: ${fakeRangePass ? "PASS" : "FAIL"}`);
  console.log(`  Has REAL predictions: ${hasReal ? "PASS" : "FAIL"}`);
  console.log(`  Has FAKE predictions: ${hasFake ? "PASS" : "FAIL"}`);
  console.log(`  Overall: ${confVariationPass && realRangePass && fakeRangePass && hasReal && hasFake ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  console.log("===============================================================================");
}

runTests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});