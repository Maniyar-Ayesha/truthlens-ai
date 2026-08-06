/**
 * TruthLens AI – Base Service Class
 * All detection services extend this class for consistent interface,
 * model management, error handling, and caching support.
 */

const logger = require("../utils/logger");
const { ModelManager } = require("../utils/modelManager");

class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.modelManager = new ModelManager();
    this.cache = new Map();
  }

  async runWithCache(key, fn, ttlMs = 300000) {
    const cacheKey = `${this.serviceName}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      logger.debug(this.serviceName, `Cache hit for key: ${cacheKey}`);
      return cached.data;
    }
    const result = await fn();
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    if (this.cache.size > 500) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    return result;
  }

  async executeWithTimeout(fn, timeoutMs, label) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  normalizeStatus(raw) {
    const s = String(raw || "").toUpperCase().trim();
    const map = {
      REAL: "REAL",
      TRUE: "REAL",
      SAFE: "REAL",
      FAKE: "FAKE",
      FALSE: "FAKE",
      UNSAFE: "FAKE",
      "PARTIALLY TRUE": "PARTIALLY TRUE",
      MISLEADING: "MISLEADING",
      SUSPICIOUS: "SUSPICIOUS",
      UNCERTAIN: "UNCERTAIN",
      UNKNOWN: "UNKNOWN",
    };
    return map[s] || "UNCERTAIN";
  }

  formatConfidence(value) {
    if (typeof value === "string" && value.includes("%")) return value;
    const n = parseFloat(value);
    if (isNaN(n)) return "50%";
    return `${Math.round(Math.min(100, Math.max(0, n)))}%`;
  }

  logInfo(message, extra) {
    logger.info(this.serviceName, message, extra);
  }

  logWarn(message, extra) {
    logger.warn(this.serviceName, message, extra);
  }

  logError(message, extra) {
    logger.error(this.serviceName, message, extra);
  }
}

module.exports = { BaseService };