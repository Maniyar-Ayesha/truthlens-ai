/**
 * TruthLens AI – Async Task Queue
 * Queues long-running AI tasks and processes them asynchronously.
 * Supports job status tracking and result retrieval.
 */

const { spawn } = require("child_process");
const path = require("path");
const logger = require("./logger");

const PENDING = "pending";
const RUNNING = "running";
const COMPLETED = "completed";
const FAILED = "failed";

class TaskQueue {
  constructor() {
    this.jobs = new Map();
    this.queue = [];
    this.concurrency = 3;
    this.runningCount = 0;
  }

  addJob(jobId, taskFn, opts = {}) {
    const job = {
      id: jobId,
      taskFn,
      status: PENDING,
      result: null,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      opts,
    };
    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    this.processQueue();
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  async processQueue() {
    if (this.runningCount >= this.concurrency) return;
    if (this.queue.length === 0) return;

    this.runningCount++;
    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);
    if (!job) {
      this.runningCount--;
      return;
    }

    job.status = RUNNING;
    job.startedAt = Date.now();

    try {
      const result = await job.taskFn();
      job.status = COMPLETED;
      job.result = result;
    } catch (error) {
      job.status = FAILED;
      job.error = error.message;
      logger.error("TaskQueue", `Job ${jobId} failed: ${error.message}`);
    } finally {
      job.completedAt = Date.now();
      job.taskFn = null; // Free reference
      this.runningCount--;
      this.processQueue();
    }
  }

  addTask(scriptPath, args = [], timeoutMs = 120000) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.addJob(jobId, async () => {
      return new Promise((resolve, reject) => {
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const child = spawn(pythonCmd, [scriptPath, ...args], {
          cwd: path.dirname(scriptPath),
          env: { ...process.env },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => { stdout += data.toString(); });
        child.stderr.on("data", (data) => { stderr += data.toString(); });

        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`Task timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        child.on("close", (code) => {
          clearTimeout(timer);
          if (code !== 0 && !stdout.trim()) {
            return reject(new Error(`Python exited with code ${code}: ${stderr.trim().slice(0, 200)}`));
          }
          const jsonLine = stdout.trim().split("\n").reverse().find((line) => {
            try { JSON.parse(line); return true; } catch { return false; }
          });
          if (!jsonLine) return reject(new Error("No valid JSON output"));
          resolve(JSON.parse(jsonLine));
        });

        child.on("error", (err) => {
          clearTimeout(timer);
          reject(new Error(`Failed to start task: ${err.message}`));
        });
      });
    }, { scriptPath, args, timeoutMs });

    return jobId;
  }

  getStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  getActiveCount() {
    return this.runningCount;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

const taskQueue = new TaskQueue();

module.exports = { TaskQueue, taskQueue, PENDING, RUNNING, COMPLETED, FAILED };