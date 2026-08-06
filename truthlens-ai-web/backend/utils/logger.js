/**
 * TruthLens AI – Simple Logger Utility
 * Provides timestamped, levelled console logging without external dependencies.
 */

const LEVELS = { INFO: "INFO", WARN: "WARN", ERROR: "ERROR", DEBUG: "DEBUG" };

function timestamp() {
  return new Date().toISOString();
}

function log(level, module, message, extra) {
  const prefix = `[${timestamp()}] [${level}] [${module}]`;
  if (extra !== undefined) {
    console.log(`${prefix} ${message}`, extra);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const logger = {
  info:  (mod, msg, extra) => log(LEVELS.INFO,  mod, msg, extra),
  warn:  (mod, msg, extra) => log(LEVELS.WARN,  mod, msg, extra),
  error: (mod, msg, extra) => log(LEVELS.ERROR, mod, msg, extra),
  debug: (mod, msg, extra) => {
    if (process.env.NODE_ENV !== "production") {
      log(LEVELS.DEBUG, mod, msg, extra);
    }
  },
};

module.exports = logger;
