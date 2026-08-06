const express = require("express");
const router = express.Router();
const { taskQueue } = require("../utils/taskQueue");
const { optionalAuth } = require("../middlewares/authMiddleware");

router.get("/queue/status", optionalAuth, async (req, res, next) => {
  try {
    res.json({
      activeJobs: taskQueue.getActiveCount(),
      queuedJobs: taskQueue.getQueueLength(),
      totalJobs: taskQueue.jobs.size,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/queue/job/:jobId", optionalAuth, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = taskQueue.getStatus(jobId);
    if (!status) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.get("/queue/jobs", optionalAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const jobs = [];
    for (const [jobId, job] of taskQueue.jobs.entries()) {
      if (status && job.status !== status) continue;
      jobs.push({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      });
    }
    res.json({ jobs, total: jobs.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;