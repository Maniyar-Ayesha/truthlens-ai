/**
 * TruthLens AI – Chat Service (Upgraded)
 * Context-aware AI chat with offline fallback when API keys are unavailable.
 */

const axios = require("axios");
const History = require("../models/History");
const logger = require("../utils/logger");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are TruthLens AI Assistant, an expert in:
- Fake news and misinformation detection
- Deepfake image and video analysis
- Suspicious URL and phishing detection
- AI-generated content identification
- Cybersecurity awareness
- Media literacy education

Guidelines:
- Answer clearly, factually, and in simple English
- When unsure, say so and suggest verification steps
- Provide actionable advice users can follow
- Keep responses concise (under 300 words unless detail is needed)
- Do NOT generate or assist with creating fake news or deepfakes
- For technical questions, explain in layman's terms
- Use the user's analysis history context when provided to give personalized advice`;

function buildHistoryContext(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const recent = history.slice(-5);
  const lines = recent.map((h) => {
    const type = h.type || "unknown";
    const status = h.status || "unknown";
    const confidence = h.confidence || "N/A";
    const trustScore = h.trustScore ?? "N/A";
    return `- ${type} analysis: ${status} (confidence: ${confidence}, trust score: ${trustScore})`;
  });

  return `\n\nUser's previous analysis history:\n${lines.join("\n")}`;
}

function offlineReply(message, analysisHistory = []) {
  const text = String(message || "").toLowerCase();
  const historyNote =
    analysisHistory.length > 0
      ? ` I can see you have ${analysisHistory.length} recent analyses in your history.`
      : "";

  if (/fake news|misinformation|news detect/.test(text)) {
    return (
      "TruthLens detects fake news using a hybrid pipeline: text cleaning → TF-IDF → Logistic Regression, Random Forest, and Naive Bayes ensemble → dataset similarity → sentence-transformer similarity → Google Fact Check and GNews → weighted confidence." +
      historyNote +
      " Paste a headline or article on the News Detection page to analyze it."
    );
  }

  if (/deepfake|image|photo|picture/.test(text)) {
    return (
      "Image deepfake detection combines metadata analysis, Error Level Analysis (ELA), noise patterns, and CNN ensemble signals (EfficientNet / ResNet / Xception / Vision models when available)." +
      historyNote +
      " Upload a PNG, JPG, JPEG, or WEBP on the Image Detection page."
    );
  }

  if (/video|lip.?sync|temporal/.test(text)) {
    return (
      "Video deepfake detection extracts frames, detects faces, classifies frames with a CNN, then runs temporal and lip-sync models. Results use trained models only — never random confidence." +
      historyNote +
      " Upload MP4, AVI, MOV, or MKV on the Video Detection page."
    );
  }

  if (/url|phishing|malware|link|domain/.test(text)) {
    return (
      "URL detection validates the link, then checks WHOIS, SSL, domain age, blacklists, Google Safe Browsing, and a trained ML URL classifier before returning REAL / FAKE / UNCERTAIN with risk factors." +
      historyNote +
      " Enter a URL on the URL Verification page."
    );
  }

  if (/media literacy|cyber|secure|password|otp/.test(text)) {
    return (
      "Media literacy tip: verify sources, check publication date, look for emotional clickbait, reverse-search images, and never click unexpected shortened links. Enable 2FA and avoid reusing passwords." +
      historyNote
    );
  }

  if (/history|dashboard|report|pdf|profile/.test(text)) {
    return (
      "Your analyses are saved automatically to History. The Dashboard shows counts and recent activity. You can download a PDF report from the Result page, and update your name/username in Profile." +
      historyNote
    );
  }

  if (/hello|hi|hey|help|what can you/.test(text)) {
    return (
      "Hi! I'm the TruthLens AI assistant. Ask me about fake news, deepfake images/videos, suspicious URLs, cybersecurity, or media literacy. You can also analyze content from the Dashboard." +
      historyNote
    );
  }

  return (
    "I can help explain TruthLens AI detection (news, image, video, URL), media literacy, and cybersecurity basics." +
    historyNote +
    " Try asking about a specific detection type, or run an analysis from the Dashboard."
  );
}

async function chat(message, history = [], userEmail = null) {
  let analysisHistory = [];
  if (userEmail) {
    try {
      analysisHistory = await History.find({ email: userEmail })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("type status confidence trustScore createdAt")
        .lean();
    } catch (error) {
      logger.warn("ChatService", `Failed to fetch analysis history: ${error.message}`);
    }
  }

  const historyContext = buildHistoryContext(analysisHistory);

  if (!OPENROUTER_API_KEY && !GEMINI_API_KEY) {
    return offlineReply(message, analysisHistory);
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + historyContext },
    ...history.slice(-10).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: String(h.content || "").slice(0, 500),
    })),
    { role: "user", content: message },
  ];

  if (OPENROUTER_API_KEY) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openrouter/auto",
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
            "X-Title": "TruthLens AI",
          },
          timeout: 30000,
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    } catch (error) {
      logger.warn("ChatService", `OpenRouter failed: ${error.message}`);
    }
  }

  if (GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: messages.map((m) => `${m.role}: ${m.content}`).join("\n") }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        },
        { timeout: 30000 }
      );

      const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (error) {
      logger.warn("ChatService", `Gemini failed: ${error.message}`);
    }
  }

  return offlineReply(message, analysisHistory);
}

module.exports = { chat };
