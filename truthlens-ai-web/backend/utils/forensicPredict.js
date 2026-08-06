/**
 * Wire forensic ensemble into image analysis when CNN weights are unavailable.
 * Called from imageService with ELA/noise/metadata features.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const logger = require("./logger");

const FORENSIC_SCRIPT = path.join(__dirname, "..", "ai", "forensic_predict.py");

function runForensicPredict(features, timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!fs.existsSync(FORENSIC_SCRIPT)) {
      return resolve(null);
    }

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const child = spawn(pythonCmd, [FORENSIC_SCRIPT, JSON.stringify(features)], {
      cwd: path.dirname(FORENSIC_SCRIPT),
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, timeoutMs);

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.warn("ForensicPredict", stderr || "forensic predict failed");
        return resolve(null);
      }
      try {
        const lines = stdout.trim().split("\n").filter(Boolean);
        resolve(JSON.parse(lines[lines.length - 1]));
      } catch {
        resolve(null);
      }
    });
    child.on("error", () => resolve(null));
  });
}

module.exports = { runForensicPredict };
