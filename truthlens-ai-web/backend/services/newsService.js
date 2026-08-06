/**
 * TruthLens AI – News Analysis Service (Fixed Pipeline)
 * ======================================================
 * Pipeline:
 *  1. Ensemble Prediction (Logistic Regression + Random Forest + Naive Bayes)
 *  2. Dataset Similarity Search (Fake.csv + True.csv) via TF-IDF Cosine Similarity
 *  3. Adjust ML confidence based on dataset similarity
 *  4. GNews trusted publisher verification
 *  5. Google Fact Check API
 *  6. Weighted score combination
 *  7. Final classification mapping
 *  8. Explanation generation
 */

const axios = require("axios");
const { runMLScript, runAIScript } = require("../utils/pythonRunner");
const { searchDataset } = require("./datasetService");
const { formatNewsResponse } = require("../utils/responseFormatter");
const { globalCache } = require("../utils/cache");
const { mapConfidence } = require("../utils/confidenceMapper");
const logger = require("../utils/logger");

const FACT_CHECK_API_KEY = process.env.GOOGLE_FACT_CHECK_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const TRUSTED_PUBLISHERS = new Set([
  "Reuters",
  "Associated Press",
  "BBC",
  "CNN",
  "The New York Times",
  "The Washington Post",
  "NPR",
  "PBS",
  "AP News",
  "The Guardian",
  "Financial Times",
  "Wall Street Journal",
  "Bloomberg",
  "The Economist",
  "Nature",
  "Science",
  "Al Jazeera",
  "France 24",
  "NHK World",
  "Deutsche Welle",
  "BBC News",
  "CBS News",
  "NBC News",
  "ABC News",
  "The Atlantic",
  "The Wall Street Journal",
  "Reuters News",
  "Associated Press News",
  "Agence France-Presse",
  "United Press International",
]);

function isTrustedPublisher(source) {
  if (!source) return false;
  const s = source.toLowerCase();
  for (const tp of TRUSTED_PUBLISHERS) {
    if (s.includes(tp.toLowerCase())) return true;
    if (tp.toLowerCase().includes(s) && s.length > 3) return true;
  }
  return false;
}

async function runEnsembleModel(text) {
  const cacheKey = `news_ml:${text.slice(0, 100)}`;
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;

  const result = await _runEnsembleModel(text);
  globalCache.set(cacheKey, result, 600000);
  return result;
}

async function _runEnsembleModel(text) {
  try {
    const res = await runMLScript("predict_news.py", [text.slice(0, 2000)], 30000);
    return {
      prediction: res.prediction || "UNCERTAIN",
      confidence: typeof res.confidence === "number" ? res.confidence : 55.0,
      rawModelConfidence: res.raw_model_confidence || 50.0,
      modelType: res.model_type || "Ensemble(LR+RF+NB)",
      lowConfidence: res.low_confidence !== false,
      topFeatures: res.top_features || [],
      fakeProb: res.fake_prob || 50.0,
      realProb: res.real_prob || 50.0,
      individualPredictions: res.individual_predictions || [],
      individualConfidences: res.individual_confidences || [],
      modelTypes: res.model_types || [],
    };
  } catch (error) {
    logger.warn("NewsService", `Ensemble model failed: ${error.message}`);
    return {
      prediction: "UNCERTAIN",
      confidence: 55.0,
      rawModelConfidence: 50.0,
      modelType: "Ensemble(LR+RF+NB)",
      lowConfidence: true,
      topFeatures: [],
      fakeProb: 50.0,
      realProb: 50.0,
      individualPredictions: ["UNCERTAIN", "UNCERTAIN", "UNCERTAIN"],
      individualConfidences: [50, 50, 50],
      modelTypes: ["LogisticRegression", "RandomForest", "NaiveBayes"],
    };
  }
}

async function runSemanticSimilarity(text) {
  try {
    const result = await runAIScript("semantic_search.py", [text.slice(0, 1000)], 30000);
    return result.matches || [];
  } catch (error) {
    logger.warn("NewsService", `Semantic similarity failed (non-fatal): ${error.message}`);
    return [];
  }
}

async function runFactCheck(text) {
  if (!FACT_CHECK_API_KEY) {
    return { found: false, claims: [], score: 50 };
  }

  try {
    const query = text.slice(0, 200);
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${FACT_CHECK_API_KEY}&query=${encodeURIComponent(query)}&languageCode=en`;
    const response = await axios.get(url, { timeout: 8000 });

    const claims = (response.data.claims || []).slice(0, 5).map((claim) => ({
      text: claim.text || "",
      claimant: claim.claimant || "Unknown",
      rating: claim.claimReview?.[0]?.textualRating || "Unknown",
      publisher: claim.claimReview?.[0]?.publisher?.name || "Unknown",
      url: claim.claimReview?.[0]?.url || "",
      datePublished: claim.claimReview?.[0]?.datePublished || "",
    }));

    let score = 50;
    if (claims.length > 0) {
      const ratings = claims.map((c) => (c.rating || "").toLowerCase());
      const trueCount = ratings.filter((r) => r.includes("true") || r.includes("correct") || r.includes("accurate")).length;
      const falseCount = ratings.filter((r) => r.includes("false") || r.includes("fake") || r.includes("incorrect") || r.includes("mislead")).length;
      if (trueCount > falseCount) score = 90;
      else if (falseCount > trueCount) score = 10;
    }

    return { found: claims.length > 0, claims, score };
  } catch (error) {
    logger.warn("NewsService", `Fact Check API failed (non-fatal): ${error.message}`);
    return { found: false, claims: [], score: 50 };
  }
}

async function runGNewsSearch(text) {
  if (!GNEWS_API_KEY) {
    return [];
  }

  try {
    const cleanQuery = text.replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
    if (!cleanQuery) return [];
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cleanQuery)}&lang=en&max=10&apikey=${GNEWS_API_KEY}`;
    const response = await axios.get(url, { timeout: 8000 });

    const allArticles = (response.data.articles || []).slice(0, 10);

    const trustedArticles = allArticles.filter((article) => {
      const source = article.source?.name || "";
      const domain = article.url ? new URL(article.url).hostname : "";
      const domainLower = domain.toLowerCase();
      return (
        isTrustedPublisher(source) ||
        domainLower.includes("reuters.com") ||
        domainLower.includes("apnews.com") ||
        domainLower.includes("bbc.com") ||
        domainLower.includes("bbc.co.uk") ||
        domainLower.includes("nytimes.com") ||
        domainLower.includes("washingtonpost.com") ||
        domainLower.includes("theguardian.com") ||
        domainLower.includes("bloomberg.com") ||
        domainLower.includes("nature.com") ||
        domainLower.includes("science.org") ||
        domainLower.includes("npr.org") ||
        domainLower.includes("pbs.org")
      );
    });

    return trustedArticles.slice(0, 5).map((article) => ({
      title: article.title || "",
      publisher: article.source?.name || "Unknown",
      publishedDate: article.publishedAt || "",
      source: article.source?.name || "Unknown",
      headline: article.title || "",
      url: article.url || "",
      domain: article.url ? new URL(article.url).hostname : "",
    }));
  } catch (error) {
    logger.warn("NewsService", `GNews API failed (non-fatal): ${error.message}`);
    return [];
  }
}

function computeDatasetScore(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { score: 50, topMatch: null, realWeight: 0, fakeWeight: 0 };
  }

  let realWeight = 0;
  let fakeWeight = 0;
  let topMatch = null;
  let topSimilarity = 0;

  for (const m of matches) {
    const sim = m.similarity || 0;
    if (m.label === "FAKE") fakeWeight += sim;
    else if (m.label === "REAL") realWeight += sim;

    if (sim > topSimilarity) {
      topSimilarity = sim;
      topMatch = m;
    }
  }

  const total = realWeight + fakeWeight;
  let score = 50;

  if (topSimilarity >= 80) {
    score = topMatch.label === "REAL" ? 92 : 8;
  } else if (topSimilarity >= 60) {
    score = topMatch.label === "REAL" ? 78 : 22;
  } else if (topSimilarity >= 40) {
    score = topMatch.label === "REAL" ? 62 : 38;
  } else if (topSimilarity >= 20 && total > 0) {
    const realRatio = realWeight / total;
    if (realRatio > 0.65) {
      score = 55 + Math.round((realRatio - 0.5) * 20);
    } else if (realRatio < 0.35) {
      score = 45 - Math.round((0.5 - realRatio) * 20);
    }
  }

  score = Math.max(0, Math.min(100, score));

  return { score, topMatch, realWeight, fakeWeight };
}

function computeGNewsScore(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return 50;
  }
  if (articles.length >= 3) return 90;
  if (articles.length === 2) return 75;
  return 60;
}

function computeMLScore(ml) {
  if (ml.prediction === "REAL") {
    return ml.realProb;
  } else if (ml.prediction === "FAKE") {
    return ml.realProb;
  }
  return 50;
}

function combineScores(mlScore, datasetScore, gnewsScore, factCheckScore) {
  const finalScore =
    mlScore * 0.40 +
    datasetScore * 0.30 +
    gnewsScore * 0.20 +
    factCheckScore * 0.10;

  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

function mapScoreToStatus(score) {
  if (score >= 70) return "REAL";
  if (score >= 50) return "UNCERTAIN";
  return "FAKE";
}

function buildExplanation({
  text,
  ml,
  datasetScore,
  datasetTopMatch,
  gnewsArticles,
  factCheck,
  finalScore,
  finalStatus,
}) {
  const lines = [];

  lines.push(`ML Ensemble:`);
  lines.push(`${ml.prediction} (${ml.confidence}% confidence)`);
  lines.push("");

  if (datasetTopMatch) {
    lines.push(`Dataset:`);
    lines.push(`${datasetTopMatch.similarity}% similarity with ${datasetTopMatch.label} dataset`);
    if (datasetTopMatch.title) {
      lines.push(`"${datasetTopMatch.title.slice(0, 80)}"`);
    }
  } else {
    lines.push(`Dataset:`);
    lines.push(`No strong similarity match found in verified dataset`);
  }
  lines.push("");

  if (gnewsArticles.length > 0) {
    lines.push(`Trusted News:`);
    const publishers = [...new Set(gnewsArticles.map((a) => a.publisher).filter(Boolean))];
    publishers.forEach((p) => lines.push(p));
  } else {
    lines.push(`Trusted News:`);
    lines.push(`No matching articles from trusted publishers found`);
  }
  lines.push("");

  if (factCheck.found && factCheck.claims.length > 0) {
    lines.push(`Google Fact Check:`);
    factCheck.claims.forEach((c) => {
      lines.push(`"${c.text?.slice(0, 100) || c.claim?.slice(0, 100) || "Unknown"}" rated "${c.rating}" by ${c.publisher}`);
    });
  } else {
    lines.push(`Google Fact Check:`);
    lines.push(`No matching claim found`);
  }
  lines.push("");

  lines.push(`Final Result:`);
  lines.push(`${finalStatus}`);
  lines.push(`${finalScore}%`);

  return lines.join("\n");
}

function buildKeyPoints({
  ml,
  datasetMatches,
  datasetScore,
  datasetTopMatch,
  gnewsArticles,
  factCheck,
  finalStatus,
  finalScore,
}) {
  const points = [];

  points.push(`Trained ML Ensemble (${ml.modelType}): ${ml.prediction} at ${ml.confidence}% confidence`);

  if (ml.topFeatures.length > 0) {
    points.push(`Top TF-IDF feature words: ${ml.topFeatures.join(", ")}`);
  }

  if (datasetTopMatch) {
    points.push(`Dataset: ${datasetTopMatch.similarity}% similarity with ${datasetTopMatch.label} dataset — "${datasetTopMatch.title?.slice(0, 60)}"`);
  } else if (datasetMatches.length > 0) {
    points.push(`Dataset: No strong match found among top ${datasetMatches.length} similar articles`);
  } else {
    points.push(`Dataset: No close match found in Fake.csv / True.csv`);
  }

  if (gnewsArticles.length > 0) {
    const publishers = [...new Set(gnewsArticles.map((a) => a.publisher).filter(Boolean))];
    points.push(`Trusted News: ${publishers.length} trusted publisher(s) found — ${publishers.join(", ")}`);
  } else {
    points.push(`Trusted News: No matching articles from trusted publishers found`);
  }

  if (factCheck.found && factCheck.claims.length > 0) {
    points.push(`Fact Check: "${factCheck.claims[0]?.text?.slice(0, 70)}..." rated "${factCheck.claims[0]?.rating}" by ${factCheck.claims[0]?.publisher}`);
  } else {
    points.push(`Fact Check: No matching claim found`);
  }

  points.push(`Final Result: ${finalStatus} (${finalScore}%)`);

  return points;
}

function buildSourcesChecked(gnewsArticles, factCheck) {
  const sources = [
    `Trained ML Ensemble`,
    "TruthLens Dataset (Fake.csv + True.csv)",
    FACT_CHECK_API_KEY ? "Google Fact Check API" : "Google Fact Check API (key not set)",
    GNEWS_API_KEY ? "GNews Article Search (trusted publishers only)" : "GNews (key not set)",
    OPENROUTER_API_KEY || GEMINI_API_KEY ? "AI Explanation Engine" : "Rule-based Explanation Engine",
    "Semantic Similarity Search",
  ];

  if (gnewsArticles.length > 0) {
    const uniquePublishers = [...new Set(gnewsArticles.map((a) => a.publisher).filter(Boolean))];
    sources.push(`Trusted Publishers: ${uniquePublishers.join(", ")}`);
  }

  if (factCheck.found && factCheck.claims.length > 0) {
    sources.push(`Fact Check Sources: ${[...new Set(factCheck.claims.map((c) => c.publisher).filter(Boolean))].join(", ")}`);
  }

  return sources;
}

async function analyzeNews(text) {
  const startTime = Date.now();

  const ml = await runEnsembleModel(text);

  const [datasetMatches, factCheck, gnewsArticles, semanticMatches] = await Promise.all([
    searchDataset(text, 5),
    runFactCheck(text),
    runGNewsSearch(text),
    runSemanticSimilarity(text),
  ]);

  const datasetSignal = computeDatasetScore(datasetMatches);
  const gnewsScore = computeGNewsScore(gnewsArticles);
  const factCheckScore = factCheck.score;
  const mlScore = computeMLScore(ml);

  const finalScore = combineScores(mlScore, datasetSignal.score, gnewsScore, factCheckScore);
  const finalStatus = mapScoreToStatus(finalScore);
  const displayConfidence = mapConfidence(finalStatus, finalScore);

  const ensembleVotes = {
    individualPredictions: ml.individualPredictions,
    individualConfidences: ml.individualConfidences,
    modelTypes: ml.modelTypes,
    majorityVote: ml.prediction,
    voteCounts: {
      REAL: ml.individualPredictions.filter((p) => p === "REAL").length,
      FAKE: ml.individualPredictions.filter((p) => p === "FAKE").length,
      UNCERTAIN: ml.individualPredictions.filter((p) => p === "UNCERTAIN").length,
    },
  };

  const explanation = buildExplanation({
    text,
    ml,
    datasetScore: datasetSignal.score,
    datasetTopMatch: datasetSignal.topMatch,
    gnewsArticles,
    factCheck,
    finalScore: displayConfidence,
    finalStatus,
  });

  const key_points = buildKeyPoints({
    ml,
    datasetMatches,
    datasetScore: datasetSignal.score,
    datasetTopMatch: datasetSignal.topMatch,
    gnewsArticles,
    factCheck,
    finalStatus,
    finalScore: displayConfidence,
  });

  const sources_checked = buildSourcesChecked(gnewsArticles, factCheck);

  return formatNewsResponse({
    status: finalStatus,
    confidence: `${displayConfidence}%`,
    explanation,
    key_points,
    sources_checked,
    fact_check_results: factCheck.claims,
    dataset_matches: datasetMatches,
    gnews_articles: gnewsArticles,
    semantic_matches: semanticMatches,
    processing_time_ms: Date.now() - startTime,
    ml_details: {
      individualPredictions: ml.individualPredictions,
      individualConfidences: ml.individualConfidences,
      modelTypes: ml.modelTypes,
      fakeProb: ml.fakeProb,
      realProb: ml.realProb,
      rawCombinedScore: finalScore,
    },
    ensembleVotes,
    top5SimilarNews: datasetMatches.slice(0, 5),
    googleFactCheck: factCheck.claims,
  });
}

module.exports = { analyzeNews };
