/**
 * TruthLens AI – Python Script Runner Utility
 * Safely spawns Python processes and returns parsed JSON output.
 * Handles timeouts, stderr capture, and process cleanup.
 */

const { spawn } = require("child_process");
const path = require("path");
const logger = require("./logger");

const ML_DIR  = path.join(__dirname, "..", "ml");
const AI_DIR  = path.join(__dirname, "..", "ai");

class VideoTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.code = "VIDEO_TIMEOUT";
    this.statusCode = 408;
  }
}

/**
 * Runs a Python script and returns the parsed JSON result.
 *
 * @param {string} scriptPath  Absolute path to the .py script
 * @param {string[]} args      CLI arguments to pass
 * @param {number} timeoutMs   Timeout in milliseconds (default 60s)
 * @param {string} logPrefix   Prefix for non-JSON stdout logging (e.g. "[VideoAI]")
 * @returns {Promise<object>}  Parsed JSON object from script stdout
 */
function runPythonScript(scriptPath, args = [], timeoutMs = 60000, logPrefix = null) {
  return new Promise((resolve, reject) => {
    logger.info("PythonRunner", `Spawning: python ${path.basename(scriptPath)} [${args.map(a => String(a).slice(0, 50)).join(", ")}]`);

    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    const child = spawn(pythonCmd, [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        TF_ENABLE_ONEDNN_OPTS: "0",
        TF_CPP_MIN_LOG_LEVEL: "3",
        CUDA_VISIBLE_DEVICES: "-1",
        TRANSFORMERS_NO_TF: "1",
        USE_TF: "0",
        ENABLE_HF_VIDEO: process.env.ENABLE_HF_VIDEO || "0",
      },
    });
    
    child.stdin.end(); // Prevent hanging on stdin

    let stdout = "";
    let stderr = "";
    const nonJsonLines = [];

    function processStdoutChunk(chunk) {
      const text = chunk.toString();
      stdout += text;

      if (logPrefix) {
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          if (i < lines.length - 1 || !text.endsWith("\n")) {
            try {
              JSON.parse(line);
            } catch {
              nonJsonLines.push(line);
            }
          }
        }
      }
    }

    child.stdout.on("data", (data) => {
      processStdoutChunk(data);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new VideoTimeoutError(`Python script timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);

      if (logPrefix && nonJsonLines.length > 0) {
        for (const line of nonJsonLines) {
          console.log(`${logPrefix} ${line}`);
        }
      }

      if (stderr.trim()) {
        console.error(`[Python STDERR] ${path.basename(scriptPath)}:\n${stderr.trim()}`);
      }

      if (code !== 0 && !stdout.trim()) {
        const crashHint =
          code === 3221225477 || code === -1073741819
            ? "Python native crash (Access Violation). Retrying with safer OpenCV-only analyzers is recommended."
            : stderr.trim().slice(0, 200);
        return reject(new Error(`Python exited with code ${code}: ${crashHint}`));
      }

      // Find last valid JSON object in stdout (scripts may print extra lines)
      const jsonLine = stdout.trim().split("\n").reverse().find((line) => {
        try { JSON.parse(line); return true; } catch { return false; }
      });

      if (!jsonLine) {
        logger.error("PythonRunner", `No valid JSON in stdout: ${stdout.slice(0, 300)}`);
        return reject(new Error("Python script did not return valid JSON"));
      }

      try {
        resolve(JSON.parse(jsonLine));
      } catch (e) {
        reject(new Error(`Failed to parse Python JSON output: ${e.message}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

/**
 * Convenience: run a script from the ml/ directory
 */
function runMLScript(filename, args, timeoutMs) {
  return runPythonScript(path.join(ML_DIR, filename), args, timeoutMs);
}

/**
 * Convenience: run a script from the ai/ directory
 */
function runAIScript(filename, args, timeoutMs) {
  return runPythonScript(path.join(AI_DIR, filename), args, timeoutMs);
}

/**
 * Convenience: run a video analysis script with [VideoAI] logging prefix
 */
function runVideoScript(filename, args, timeoutMs = 300000) {
  return runPythonScript(path.join(AI_DIR, filename), args, timeoutMs, "[VideoAI]");
}

module.exports = { runPythonScript, runMLScript, runAIScript, runVideoScript, VideoTimeoutError };
