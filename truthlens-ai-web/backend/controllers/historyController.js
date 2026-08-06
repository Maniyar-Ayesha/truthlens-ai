/**
 * TruthLens AI – History Controller
 * Supports: save, list (with filters), get by ID, delete by ID, clear all (user-scoped).
 */
const History = require("../models/History");
const logger = require("../utils/logger");

async function saveHistory(req, res, next) {
  try {
    const data = req.body;
    const authEmail = req.user?.email;
    const email = (authEmail || data.email || "guest").toLowerCase();

    const historyPayload = {
      userId: req.user?.id || data.userId || email,
      email,
      detectionType: data.type || "Unknown",
      type: data.type || "Unknown",
      input: data.inputText || data.checked_url || data.checkedUrl || "Uploaded Content",
      inputText: (data.inputText || data.checked_url || data.checkedUrl || "Uploaded Content").toString().slice(0, 500),
      prediction: data.prediction || data.status || "UNCERTAIN",
      status: data.prediction || data.status || "UNCERTAIN",
      confidence: data.confidence || data.accuracy || "50%",
      explanation: data.explanation || "No explanation provided.",
      timestamp: new Date(),
      key_points: data.keyFindings || data.key_points || [],
      sources_checked: data.sources_checked || [],
      confidenceBreakdown: data.confidenceBreakdown || null,
      trustScore: data.trust_score ?? data.trustScore ?? null,
      processingTime:
        typeof data.processingTime === "string"
          ? parseFloat(data.processingTime.replace("s", ""))
          : data.processingTime_ms
          ? data.processingTime_ms / 1000
          : data.processing_time_ms
          ? data.processing_time_ms / 1000
          : 0,
      factCheckResults: data.fact_check_results || data.googleFactCheck || [],
      datasetMatches: data.dataset_matches || data.top5SimilarNews || [],
      gnewsArticles: data.gnews_articles || [],
      semanticMatches: data.semantic_matches || [],
      mlDetails: data.ml_details || data.model_details || null,
      manipulatedRegions: data.manipulated_regions || [],
      heatmapUrl: data.heatmap_url || null,
      checkedUrl: data.checked_url || null,
      domainAge: data.domain_age || null,
      sslStatus: data.ssl_status || null,
      blacklistStatus: data.blacklist_status || null,
      modelType: data.model || data.modelType || null,
    };

    if (data.frame_results) historyPayload.frameResults = data.frame_results;
    if (data.lip_sync_analysis) historyPayload.lipSyncAnalysis = data.lip_sync_analysis;
    if (data.temporal_analysis) historyPayload.temporalAnalysis = data.temporal_analysis;
    if (data.face_detection) historyPayload.faceDetection = data.face_detection;

    const history = await History.create(historyPayload);
    logger.info("HistoryController", `History saved: ${history._id}`);

    res.json({ success: true, message: "History saved", history });
  } catch (error) {
    logger.error("HistoryController", `Save failed: ${error.message}`);
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const { email, type, status, search, page = 1, limit = 50, sortBy = "createdAt", order = "desc" } = req.query;

    const query = {};

    if (email) query.email = String(email).toLowerCase();
    else if (req.user?.email) query.email = req.user.email.toLowerCase();

    if (type) query.type = { $regex: type, $options: "i" };
    if (status) query.status = { $regex: status, $options: "i" };
    if (search) {
      query.$or = [
        { explanation: { $regex: search, $options: "i" } },
        { inputText: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const records = await History.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await History.countDocuments(query);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("HistoryController", `Fetch failed: ${error.message}`);
    next(error);
  }
}

async function getHistoryById(req, res, next) {
  try {
    const { id } = req.params;
    const record = await History.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json(record);
  } catch (error) {
    logger.error("HistoryController", `Fetch by ID failed: ${error.message}`);
    next(error);
  }
}

async function deleteHistoryRecord(req, res, next) {
  try {
    const { id } = req.params;
    const record = await History.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    if (req.user?.email && record.email && record.email !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this record" });
    }

    await History.findByIdAndDelete(id);
    res.json({ success: true, message: "Record deleted" });
  } catch (error) {
    logger.error("HistoryController", `Delete failed: ${error.message}`);
    next(error);
  }
}

async function clearHistory(req, res, next) {
  try {
    const email = (req.query.email || req.body?.email || req.user?.email || "").toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to clear history",
      });
    }

    const result = await History.deleteMany({ email });
    res.json({ success: true, message: `Deleted ${result.deletedCount} records` });
  } catch (error) {
    logger.error("HistoryController", `Clear failed: ${error.message}`);
    next(error);
  }
}

module.exports = { saveHistory, getHistory, getHistoryById, deleteHistoryRecord, clearHistory };
