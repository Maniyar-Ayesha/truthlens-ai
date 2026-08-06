/**
 * TruthLens AI – Dashboard Analytics Service
 * Provides aggregated statistics for the dashboard.
 */

const History = require("../models/History");
const logger = require("../utils/logger");

async function getDashboardStats(email) {
  try {
    const query = email ? { email } : {};

    const total = await History.countDocuments(query);

    const fakeCount = await History.countDocuments({
      ...query,
      $or: [
        { status: "FAKE" },
        { status: "MISLEADING" },
        { status: "SUSPICIOUS" },
        { status: "UNSAFE" },
      ],
    });

    const realCount = await History.countDocuments({
      ...query,
      $or: [
        { status: "REAL" },
        { status: "SAFE" },
      ],
    });

    const imageCount = await History.countDocuments({
      ...query,
      type: { $regex: "image", $options: "i" },
    });

    const videoCount = await History.countDocuments({
      ...query,
      type: { $regex: "video", $options: "i" },
    });

    const urlCount = await History.countDocuments({
      ...query,
      type: { $regex: "url", $options: "i" },
    });

    const newsCount = await History.countDocuments({
      ...query,
      type: { $regex: "news", $options: "i" },
    });

    const avgTrust = await History.aggregate([
      { $match: query },
      { $group: { _id: null, avgTrust: { $avg: "$trustScore" } } },
    ]);

    const recentActivity = await History.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("type status confidence trustScore createdAt")
      .lean();

    const trustScores = await History.aggregate([
      { $match: query },
      { $group: { _id: "$type", avgTrust: { $avg: "$trustScore" }, count: { $sum: 1 } } },
      { $sort: { avgTrust: -1 } },
    ]);

    const typeBreakdown = {};
    for (const ts of trustScores) {
      typeBreakdown[ts._id] = {
        count: ts.count,
        avgTrust: Math.round(ts.avgTrust || 0),
      };
    }

    const overallTrust = avgTrust.length > 0
      ? Math.round(avgTrust[0].avgTrust || 0)
      : 0;

    const riskDistribution = {
      low: await History.countDocuments({ ...query, trustScore: { $gte: 70 } }),
      medium: await History.countDocuments({ ...query, trustScore: { $gte: 40, $lt: 70 } }),
      high: await History.countDocuments({ ...query, trustScore: { $lt: 40 } }),
    };

    return {
      totalAnalysis: total,
      fakeNews: fakeCount,
      realNews: realCount,
      imagesChecked: imageCount,
      videosChecked: videoCount,
      urlsChecked: urlCount,
      newsChecked: newsCount,
      averageTrustScore: overallTrust,
      riskDistribution,
      typeBreakdown,
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("DashboardService", `Failed to get stats: ${error.message}`);
    return {
      totalAnalysis: 0,
      fakeNews: 0,
      realNews: 0,
      imagesChecked: 0,
      videosChecked: 0,
      urlsChecked: 0,
      newsChecked: 0,
      averageTrustScore: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      typeBreakdown: {},
      recentActivity: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

async function getTypeTrends(email, days = 30) {
  try {
    const query = email ? { email } : {};
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await History.aggregate([
      { $match: { ...query, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            type: "$type",
          },
          count: { $sum: 1 },
          avgTrust: { $avg: "$trustScore" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    return trends;
  } catch (error) {
    logger.error("DashboardService", `Failed to get trends: ${error.message}`);
    return [];
  }
}

module.exports = { getDashboardStats, getTypeTrends };