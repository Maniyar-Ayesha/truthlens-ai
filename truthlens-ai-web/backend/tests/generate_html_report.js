/**
 * Generate a simple HTML test report from unit + API test runs.
 * Usage: node tests/generate_html_report.js
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "reports");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    shell: true,
    timeout: 300000,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

const unit = run("node", ["tests/unit.test.js"]);
const api = run("node", ["tests/api.test.js"]);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TruthLens AI Test Report</title>
  <style>
    body { font-family: Segoe UI, sans-serif; background: #0b1220; color: #e5e7eb; padding: 32px; }
    h1 { color: #22d3ee; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
    pre { white-space: pre-wrap; background: #020617; padding: 16px; border-radius: 12px; overflow: auto; }
    .ok { color: #34d399; } .bad { color: #f87171; }
  </style>
</head>
<body>
  <h1>TruthLens AI – Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <div class="card">
    <h2>Unit Tests <span class="${unit.code === 0 ? "ok" : "bad"}">${unit.code === 0 ? "PASSED" : "FAILED"}</span></h2>
    <pre>${(unit.stdout + "\n" + unit.stderr).replace(/</g, "&lt;")}</pre>
  </div>
  <div class="card">
    <h2>API Tests <span class="${api.code === 0 ? "ok" : "bad"}">${api.code === 0 ? "PASSED" : "FAILED"}</span></h2>
    <pre>${(api.stdout + "\n" + api.stderr).replace(/</g, "&lt;")}</pre>
  </div>
</body>
</html>`;

const outPath = path.join(outDir, "test-report.html");
fs.writeFileSync(outPath, html, "utf8");
console.log(`HTML report written to ${outPath}`);
process.exit(unit.code === 0 && api.code === 0 ? 0 : 1);
