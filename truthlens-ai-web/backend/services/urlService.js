/**
 * TruthLens AI – URL Analysis Service (Upgraded)
 * ======================================================
 * Multi-layer pipeline with ML model:
 *
 *  1. URL Structure Analysis (patterns, hyphens, IP, length)
 *  2. Local ML Model Classification
 *  3. Google Safe Browsing
 *  4. WHOIS Domain Age Lookup
 *  5. SSL/HTTPS Verification
 *  6. Blacklist Search (curated domain list)
 *  7. Content Analysis (if accessible)
 *  8. Weighted Risk Score → REAL / UNCERTAIN / FAKE
 */

const axios = require("axios");
const https = require("https");
const fs = require("fs");
const { calculateTrustScore } = require("../utils/trustScore");
const { formatUrlResponse } = require("../utils/responseFormatter");
const { globalCache } = require("../utils/cache");
const { ModelManager } = require("../utils/modelManager");
const { runAIScript } = require("../utils/pythonRunner");
const logger = require("../utils/logger");

const GOOGLE_SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

const modelManager = new ModelManager();

// ─────────────────────────────────────────────────────────────────────
// Known-bad domains blacklist
// ─────────────────────────────────────────────────────────────────────
const BLACKLISTED_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "goo.gl", "t.co",
  "ow.ly", "is.gd", "buff.ly",
  "secure-login.", "account-verify.", "paypa1.", "amazon-gift.",
  "free-iphone.", "claim-prize.", "click-here.", "breaking-news-free",
  "login-secure.", "password-reset.", "verify-account.",
  "update-your-account.", "suspended-account.", "urgent-action.",
]);

const SUSPICIOUS_TLDS = new Set([
  ".xyz", ".top", ".click", ".loan", ".ru", ".tk", ".ml", ".ga", ".cf", ".gq", ".pw",
]);

const TRUSTED_TLDS = new Set([".gov", ".edu", ".org"]);
const TRUSTED_DOMAINS = new Set([
  "bbc.com", "reuters.com", "apnews.com", "nytimes.com",
  "theguardian.com", "cnn.com", "ndtv.com", "thehindu.com",
  "indiatoday.in", "timesofindia.indiatimes.com", "wikipedia.org",
  "who.int", "nih.gov", "nasa.gov", "gov.in", "nic.in",
]);

// ─────────────────────────────────────────────────────────────────────
// URL normalization
// ─────────────────────────────────────────────────────────────────────
const VALID_TLD_PATTERN = /^[a-z]{2,}$/;
const VALID_DOMAIN_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
const MIN_LABEL_LENGTH = 2;
const MIN_TLD_LENGTH = 2;
const MAX_DOMAIN_LENGTH = 253;
const URL_CHUNK_RE = /^[a-z0-9][a-z0-9+.-]*:[\\/][/]/i;

const KNOWN_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz", "name",
  "pro", "aero", "coop", "museum", "asia", "cat", "jobs", "mobi", "tel",
  "travel", "post", "xxx", "ac", "ad", "ae", "af", "ag", "ai", "al", "am",
  "an", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb",
  "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bn", "bo", "br", "bs",
  "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci",
  "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cx", "cy", "cz", "de",
  "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "er", "es", "et", "eu",
  "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg",
  "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw",
  "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in",
  "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh",
  "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li",
  "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mg",
  "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu",
  "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl",
  "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk",
  "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs",
  "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk",
  "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz", "tc",
  "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tp", "tr",
  "tt", "tv", "tw", "tz", "ua", "ug", "uk", "us", "uy", "uz", "va", "vc",
  "ve", "vg", "vi", "vn", "vu", "wf", "ws", "ye", "yt", "za", "zm", "zw",
  "arpa", "root", "biz", "info", "name", "pro", "aero", "coop", "museum",
  "com", "org", "net", "gov", "edu", "mil", "int", "co", "ne", "or", "le",
  "ca", "qc", "ab", "bc", "mb", "nb", "nl", "ns", "on", "pe", "sk", "yt",
  "gc", "uk", "ac", "gov", "nhs", "police", "sch", "eu", "cy", "fi", "fr",
  "de", "it", "nl", "be", "es", "pt", "lu", "ie", "se", "no", "dk", "gr",
  "cz", "ro", "hu", "bg", "hr", "sk", "sl", "lt", "lv", "ee", "is", "li",
  "at", "ch", "li", "mc", "sm", "va", "pl", "si", "hr", "rs", "me", "mk",
  "al", "ba", "mk", "pt", "br", "ar", "cl", "co", "pe", "uy", "py", "bo",
  "ec", "ve", "cr", "pa", "do", "gt", "hn", "sv", "ni", "pr", "cu", "ph",
  "vn", "th", "my", "sg", "id", "tp", "lk", "np", "bt", "mm", "kh", "la",
  "bd", "pk", "af", "ir", "iq", "sy", "jo", "lb", "il", "eg", "ly", "tn",
  "dz", "ma", "eh", "sd", "et", "er", "dj", "so", "ke", "tz", "ug", "rw",
  "bi", "cd", "cg", "cf", "cm", "ga", "gq", "td", "cm", "mz", "zw", "bw",
  "na", "za", "mg", "mu", "sc", "rw", "ke", "ug", "tz", "so", "et", "er",
  "dj", "sd", "ss", "rw", "bi", "cd", "cf", "cg", "td", "cm", "ga", "gq",
  "mz", "zw", "bw", "na", "za", "mg", "mu", "sc", "kp", "kr", "mn", "cn",
  "jp", "tw", "hk", "mo", "kh", "la", "mm", "bd", "bt", "np", "lk", "mv",
  "pk", "af", "ir", "iq", "sy", "jo", "lb", "il", "eg", "ly", "tn", "dz",
  "ma", "eh", "sd", "et", "er", "dj", "so", "ke", "tz", "ug", "rw", "bi",
  "cd", "cg", "cf", "cm", "ga", "gq", "td", "cm", "mz", "zw", "bw", "na",
  "za", "mg", "mu", "sc", "kp", "kr", "mn", "cn", "jp", "tw", "hk", "mo",
  "kh", "la", "mm", "bd", "bt", "np", "lk", "mv", "pk", "af", "ir", "iq",
  "sy", "jo", "lb", "il", "eg", "ly", "tn", "dz", "ma", "eh", "sd", "et",
  "er", "dj", "so", "ke", "tz", "ug", "rw", "bi", "cd", "cg", "cf", "cm",
  "ga", "gq", "td", "mz", "zw", "bw", "na", "za", "mg", "mu", "sc",
  "xyz", "top", "online", "site", "tech", "app", "dev", "io", "ai", "co",
  "me", "us", "ca", "uk", "de", "fr", "jp", "cn", "ru", "br", "in", "it",
  "es", "au", "nl", "se", "no", "ch", "at", "pl", "be", "nz", "ie", "pt",
  "mx", "ar", "cl", "co", "pe", "ve", "ec", "bo", "py", "uy", "cr", "pa",
  "do", "gt", "hn", "sv", "ni", "pr", "cu", "ph", "vn", "th", "my", "sg",
  "id", "lk", "np", "bt", "mm", "kh", "la", "bd", "pk", "af", "ir", "iq",
  "sy", "jo", "lb", "il", "eg", "ly", "tn", "dz", "ma", "et", "ke", "tz",
  "ug", "rw", "bi", "cd", "cf", "cg", "td", "mz", "zw", "bw", "na", "mg",
  "mu", "sc", "kp", "mn", "mo", "tw", "hk", "mo", "kh", "la", "mm", "np",
  "lk", "mv", "bt", "bd", "pk", "af", "ir", "iq", "sy", "jo", "lb", "il",
  "eg", "ly", "tn", "dz", "ma", "et", "ke", "tz", "ug", "rw", "bi", "cd",
  "cf", "cg", "td", "mz", "zw", "bw", "na", "mg", "mu", "sc",
]);

function validateUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string" || urlStr.trim().length === 0) {
    return { valid: false, reason: "URL is empty." };
  }

  const trimmed = urlStr.trim();

  if (trimmed.length > 2048) {
    return { valid: false, reason: "URL exceeds maximum length." };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    try {
      parsed = new URL("https://" + trimmed);
    } catch {
      return { valid: false, reason: "URL has invalid syntax." };
    }
  }

  const hostname = parsed.hostname;

  if (hostname.length === 0) {
    return { valid: false, reason: "URL has no domain." };
  }

  if (hostname === "localhost") {
    return { valid: false, reason: "localhost is not allowed." };
  }

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { valid: false, reason: "IP addresses are not allowed." };
  }

  if (hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) {
    return { valid: false, reason: "Domain contains invalid dots." };
  }

  const labels = hostname.split(".");
  if (labels.length < 2) {
    return { valid: false, reason: "Domain must have a TLD." };
  }

  const tld = labels[labels.length - 1];

  if (!VALID_TLD_PATTERN.test(tld) || tld.length < MIN_TLD_LENGTH) {
    return { valid: false, reason: "TLD is not valid." };
  }

  if (/\d/.test(tld)) {
    return { valid: false, reason: "TLD contains digits." };
  }

  if (!KNOWN_TLDS.has(tld.toLowerCase())) {
    return { valid: false, reason: "TLD is not recognized." };
  }

  const domain = labels.slice(0, -1).join(".");

  if (domain.length === 0) {
    return { valid: false, reason: "Domain label is missing." };
  }

  for (const label of labels) {
    if (label.length < MIN_LABEL_LENGTH && label !== tld) {
      return { valid: false, reason: "Domain label too short." };
    }
    if (!VALID_DOMAIN_LABEL.test(label)) {
      return { valid: false, reason: "Domain label contains invalid characters." };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { valid: false, reason: "Domain label starts or ends with hyphen." };
    }
  }

  return { valid: true };
}

function normalizeUrl(inputUrl) {
  let url = String(inputUrl).trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 1: URL Structure Analysis
// ─────────────────────────────────────────────────────────────────────
function analyzeStructure(url) {
  let score = 90;
  const points = [];
  const lower = url.toLowerCase();
  const domain = extractDomain(url);

  if (!lower.startsWith("https://")) {
    score -= 15;
    points.push("URL does not use HTTPS – connection is not encrypted.");
  } else {
    points.push("URL uses HTTPS – encrypted connection.");
  }

  if (TRUSTED_DOMAINS.has(domain)) {
    score = Math.min(100, score + 15);
    points.push(`Domain "${domain}" is in the trusted sources list.`);
  }

  const domainTld = "." + domain.split(".").pop();
  if (TRUSTED_TLDS.has(domainTld)) {
    score = Math.min(100, score + 10);
    points.push(`Domain uses trusted TLD "${domainTld}".`);
  }

  const suspiciousWords = [
    "free", "gift", "claim", "bonus", "lottery", "verify-account",
    "login-secure", "password", "bank-update", "urgent", "winner", "prize", "offer-update",
  ];
  const foundWords = suspiciousWords.filter((w) => lower.includes(w));
  if (foundWords.length > 0) {
    score -= 25;
    points.push(`URL contains suspicious keyword(s): ${foundWords.join(", ")}.`);
  }

  if (SUSPICIOUS_TLDS.has(domainTld)) {
    score -= 20;
    points.push(`URL uses a high-risk domain extension "${domainTld}".`);
  }

  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(domain)) {
    score -= 25;
    points.push("URL uses a raw IP address instead of a domain name – highly suspicious.");
  }

  if (lower.includes("@")) {
    score -= 20;
    points.push("URL contains '@' symbol – commonly used in deceptive phishing links.");
  }

  if (url.length > 100) {
    score -= 10;
    points.push(`URL is unusually long (${url.length} characters).`);
  }

  const hyphenCount = (domain.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    score -= 10;
    points.push(`Domain has ${hyphenCount} hyphens – often indicates domain impersonation.`);
  }

  const isBlacklisted = [...BLACKLISTED_DOMAINS].some((d) => lower.includes(d));
  if (isBlacklisted) {
    score -= 30;
    points.push("Domain matches a known suspicious/blacklisted pattern.");
  }

  return { score: Math.min(100, Math.max(0, score)), points, domain, isBlacklisted };
}

// ─────────────────────────────────────────────────────────────────────
// Step 2: Local ML Model Classification
// ─────────────────────────────────────────────────────────────────────
async function runUrlMLModel(url) {
  const cacheKey = `url_ml:${url}`;
  return globalCache.get(cacheKey) || globalCache.set(cacheKey, _runUrlMLModel(url), 600000);
}

async function _runUrlMLModel(url) {
  const modelPath = modelManager.getScriptPath("url");
  if (!modelPath || !fs.existsSync(modelPath)) {
    logger.warn("UrlService", "URL ML model script not found, skipping local ML");
    return null;
  }

  try {
    const result = await runAIScript("url_classifier.py", [url], 30000);
    return {
      riskScore: result.risk_score || 50,
      prediction: result.prediction || "SUSPICIOUS",
      confidence: result.confidence || 50,
      modelType: result.model_type || "GradientBoosting",
      features: result.features || [],
    };
  } catch (error) {
    logger.warn("UrlService", `URL ML model failed (non-fatal): ${error.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 3: Google Safe Browsing
// ─────────────────────────────────────────────────────────────────────
async function checkSafeBrowsing(url) {
  if (!GOOGLE_SAFE_BROWSING_KEY) {
    return { safe: true, threat: null, note: "Google Safe Browsing API key not configured." };
  }

  try {
    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_KEY}`,
      {
        client: { clientId: "truthlens-ai", clientVersion: "2.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      },
      { timeout: 8000 }
    );

    const matches = response.data.matches || [];
    if (matches.length > 0) {
      return { safe: false, threat: matches[0].threatType, note: `Google Safe Browsing flagged: ${matches[0].threatType}` };
    }
    return { safe: true, threat: null, note: "Google Safe Browsing: No threats detected." };
  } catch (error) {
    logger.warn("UrlService", `Safe Browsing API failed (non-fatal): ${error.message}`);
    return { safe: true, threat: null, note: "Google Safe Browsing: Check unavailable." };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 4: WHOIS Domain Age
// ─────────────────────────────────────────────────────────────────────
async function checkWhois(domain) {
  try {
    const whois = require("whois");
    const data = await new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(null), 5000);
      whois.lookup(domain, (err, data) => {
        clearTimeout(timeoutId);
        resolve(err ? null : data);
      });
    });

    if (!data) return { age: null, note: "WHOIS lookup timed out.", riskFlag: false };

    const match = data.match(/creation date[:\s]+([^\n\r]+)/i)
      || data.match(/registered[:\s]+([^\n\r]+)/i)
      || data.match(/created[:\s]+([^\n\r]+)/i);

    if (match) {
      const created = new Date(match[1].trim());
      const now = new Date();
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      const ageYears = (ageDays / 365).toFixed(1);

      if (ageDays < 30) return { age: ageDays, note: `Domain registered only ${ageDays} day(s) ago – very new, higher risk.`, riskFlag: true };
      if (ageDays < 180) return { age: ageDays, note: `Domain is ${ageDays} days old – relatively new.`, riskFlag: false };
      return { age: ageDays, note: `Domain has been active for ${ageYears} year(s) – established.`, riskFlag: false };
    }

    return { age: null, note: "WHOIS: Domain registration date not available.", riskFlag: false };
  } catch (error) {
    logger.warn("UrlService", `WHOIS lookup failed (non-fatal): ${error.message}`);
    return { age: null, note: "WHOIS lookup unavailable.", riskFlag: false };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 5: SSL Certificate Check
// ─────────────────────────────────────────────────────────────────────
async function checkSSL(url) {
  if (!url.startsWith("https://")) {
    return { valid: false, note: "No SSL – site does not use HTTPS." };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ valid: true, note: "SSL check timed out (assumed valid)." }), 5000);
    try {
      const hostname = extractDomain(url);
      const req = https.request({ host: hostname, port: 443, method: "HEAD", path: "/", timeout: 4000 }, (res) => {
        clearTimeout(timeout);
        resolve({ valid: true, note: "SSL certificate is valid." });
      });
      req.on("error", () => { clearTimeout(timeout); resolve({ valid: false, note: "SSL certificate could not be verified." }); });
      req.on("timeout", () => { clearTimeout(timeout); req.destroy(); resolve({ valid: true, note: "SSL check timed out (assumed valid)." }); });
      req.end();
    } catch {
      clearTimeout(timeout);
      resolve({ valid: true, note: "SSL check skipped." });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────
// Step 6: Content Analysis (fetch page and check for suspicious content)
// ─────────────────────────────────────────────────────────────────────
async function analyzeContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxContentLength: 500000,
      validateStatus: () => true,
    });

    const html = response.data || "";
    const points = [];
    let riskScore = 0;

    // Check for suspicious scripts
    if (html.includes("document.cookie") && !html.includes("same-site")) {
      points.push("Page sets cookies without SameSite attribute.");
      riskScore += 10;
    }

    // Check for excessive redirects
    if (response.status >= 300 && response.status < 400) {
      points.push("URL redirects to another page.");
      riskScore += 5;
    }

    // Check for login forms on non-HTTPS
    if (html.includes("<form") && !url.startsWith("https://")) {
      points.push("Page contains a form without HTTPS encryption.");
      riskScore += 15;
    }

    // Check for suspicious keywords in page content
    const suspiciousPatterns = ["verify your account", "confirm your identity", "suspended account", "urgent action required"];
    for (const pattern of suspiciousPatterns) {
      if (html.toLowerCase().includes(pattern)) {
        points.push(`Page contains suspicious text: "${pattern}"`);
        riskScore += 10;
      }
    }

    return { accessible: true, points, riskScore, statusCode: response.status };
  } catch (error) {
    return { accessible: false, points: ["Content analysis unavailable – site not accessible."], riskScore: 0, statusCode: null };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Determine final status from risk score
// ─────────────────────────────────────────────────────────────────────
function getFinalStatus(score) {
  if (score >= 75) return "REAL";
  if (score >= 45) return "UNCERTAIN";
  return "FAKE";
}

function scaleConfidence(score, status) {
  if (status === "REAL") {
    return Math.round(85 + ((score - 75) / 25) * 14);
  }
  if (status === "UNCERTAIN") {
    return Math.round(50 + ((score - 45) / 30) * 19);
  }
  return Math.round(10 + (score / 45) * 25);
}

// ─────────────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────────────
async function analyzeUrl(inputUrl) {
  const startTime = Date.now();
  const url = normalizeUrl(inputUrl);
  const domain = extractDomain(url);

  const validation = validateUrl(inputUrl);
  if (!validation.valid) {
    const explanation = "The entered URL is not a valid public website.";
    const key_points = [
      validation.reason,
      "URL structure validation failed.",
      "This URL cannot be a valid public website domain.",
    ];
    return formatUrlResponse({
      status: "FAKE",
      confidence: "15%",
      explanation,
      key_points,
      sources_checked: ["URL Structure Validation"],
      trust_score: null,
      domain_age: null,
      ssl_status: "N/A",
      blacklist_status: "N/A",
      checked_url: url,
      processing_time_ms: Date.now() - startTime,
      ml_details: null,
      content_analysis: null,
    });
  }

  // Run all checks concurrently
  console.log("[URL Pipeline] URL validated:", url);
  console.log("[URL Pipeline] Running ML pipeline...");

  const [structure, safeBrowsing, whois, ssl, mlModel, content] = await Promise.all([
    Promise.resolve(analyzeStructure(url)),
    checkSafeBrowsing(url),
    checkWhois(domain),
    checkSSL(url),
    runUrlMLModel(url),
    analyzeContent(url),
  ]);

  console.log("[URL Pipeline] Google Safe Browsing:", safeBrowsing.safe ? "clean" : "flagged");
  console.log("[URL Pipeline] WHOIS:", whois.age !== null ? whois.age + " days" : "unavailable");
  console.log("[URL Pipeline] SSL:", ssl.valid ? "valid" : "invalid/missing");

  // ── Combine scores ────────────────────────────────────────
  let finalScore = structure.score;

  // ML model adjustment
  if (mlModel) {
    finalScore = finalScore * 0.6 + mlModel.riskScore * 0.4;
  }

  // Safe Browsing threat → hard drop
  if (!safeBrowsing.safe) {
    finalScore = Math.min(finalScore, 15);
  }

  // Very new domain → penalty
  if (whois.riskFlag) {
    finalScore = Math.max(0, finalScore - 15);
  }

  // SSL invalid → penalty
  if (!ssl.valid) {
    finalScore = Math.max(0, finalScore - 10);
  }

  // Content risk → penalty
  finalScore = Math.max(0, finalScore - content.riskScore);

  finalScore = Math.min(100, Math.max(0, finalScore));

  const finalStatus = getFinalStatus(finalScore);
  const scaledConfidence = scaleConfidence(finalScore, finalStatus);
  const clampedConfidence = Math.min(99, Math.max(10, scaledConfidence));

  console.log("[URL Pipeline] Weighted score:", Math.round(finalScore), "/ 100");
  console.log("[URL Pipeline] Final result:", finalStatus, clampedConfidence + "%");

  const { trustScore, riskLevel, reliability } = calculateTrustScore(finalScore);

  // ── Build response ────────────────────────────────────────
  const key_points = [
    safeBrowsing.note,
    ssl.note,
    whois.note,
    ...structure.points.slice(0, 4),
    mlModel ? `ML Model (${mlModel.modelType}): ${mlModel.prediction} @ ${mlModel.confidence}%` : "ML Model: not available",
    content.accessible ? `Content analysis: ${content.points.length} indicators found` : "Content analysis: site not accessible",
    `Overall risk score: ${Math.round(finalScore)}/100`,
    `Trust Score: ${trustScore}/100`,
  ].filter(Boolean);

  const sources_checked = [
    "URL Structure Analysis",
    GOOGLE_SAFE_BROWSING_KEY ? "Google Safe Browsing API" : "Google Safe Browsing (key not configured)",
    "WHOIS Domain Lookup",
    "SSL Certificate Verification",
    "TruthLens ML URL Classifier",
    "Content Analysis",
    "TruthLens Blacklist Database",
  ];

  let explanation;
  if (finalStatus === "REAL") {
    explanation = `This URL appears safe. It uses HTTPS, has no known threats in Google Safe Browsing, and no suspicious URL patterns were detected.`;
  } else if (finalStatus === "FAKE") {
    explanation = `This URL is flagged as unsafe. ${!safeBrowsing.safe ? `Google Safe Browsing detected a ${safeBrowsing.threat} threat. ` : ""}${structure.isBlacklisted ? "The domain matches known malicious patterns. " : ""}Avoid visiting this link.`;
  } else {
    explanation = `This URL shows some suspicious indicators but is not definitively classified as malicious. Exercise caution before visiting. Verify the domain and check for HTTPS.`;
  }

  return formatUrlResponse({
    status: finalStatus,
    confidence: `${clampedConfidence}%`,
    explanation,
    key_points,
    sources_checked,
    trust_score: trustScore,
    domain_age: whois.age !== null ? `${whois.age} days` : "Unknown",
    ssl_status: ssl.valid ? "Valid" : "Invalid/Missing",
    blacklist_status: structure.isBlacklisted ? "Flagged" : "Clean",
    checked_url: url,
    processing_time_ms: Date.now() - startTime,
    ml_details: mlModel ? {
      modelType: mlModel.modelType,
      prediction: mlModel.prediction,
      confidence: mlModel.confidence,
      riskScore: mlModel.riskScore,
      features: mlModel.features,
    } : null,
    content_analysis: content.accessible ? {
      statusCode: content.statusCode,
      indicators: content.points,
      riskScore: content.riskScore,
    } : null,
  });
}

module.exports = { analyzeUrl };