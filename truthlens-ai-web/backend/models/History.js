const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    // ── Existing fields (preserved for backward compatibility) ──────────────
    email: String,
    userId: String,
    detectionType: String,
    type: String,
    input: String,
    inputText: { type: String, maxlength: 500 },
    prediction: String,
    status: String,
    confidence: String,
    explanation: String,
    key_points: [String],
    sources_checked: [String],

    // ── New fields (all optional – old records still load fine) ─────────────
    trustScore: Number,
    processingTime: Number,
    timestamp: Date,
    confidenceBreakdown: mongoose.Schema.Types.Mixed,
    factCheckResults: [mongoose.Schema.Types.Mixed],
    datasetMatches: [mongoose.Schema.Types.Mixed],
    gnewsArticles: [mongoose.Schema.Types.Mixed],
    frameResults: [mongoose.Schema.Types.Mixed],
    checkedUrl: String,
    domainAge: String,
    sslStatus: String,
    blacklistStatus: String,

    // ── Enhanced fields for upgraded pipeline ──────────────────────────────
    semanticMatches: [mongoose.Schema.Types.Mixed],
    mlDetails: mongoose.Schema.Types.Mixed,
    manipulatedRegions: [String],
    heatmapUrl: String,
    temporalAnalysis: mongoose.Schema.Types.Mixed,
    lipSyncAnalysis: mongoose.Schema.Types.Mixed,
    faceDetection: mongoose.Schema.Types.Mixed,
    contentAnalysis: mongoose.Schema.Types.Mixed,
    reverseSearch: mongoose.Schema.Types.Mixed,
    modelType: String,
    riskLevel: String,
    reliability: String,
  },
  { timestamps: true }
);

// Index for faster queries by email + type + createdAt
historySchema.index({ email: 1, createdAt: -1 });
historySchema.index({ email: 1, type: 1 });
historySchema.index({ email: 1, status: 1 });

module.exports = mongoose.model("History", historySchema);