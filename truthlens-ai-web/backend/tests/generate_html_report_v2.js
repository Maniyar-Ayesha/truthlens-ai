const fs = require("fs");
const path = require("path");

function generateHtmlReport(results, summaryData, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const moduleRowsHtml = results
    .map(
      (r, idx) => `
      <tr class="${r.status.toLowerCase()}">
        <td>${idx + 1}</td>
        <td><code>${r.testCaseId}</code></td>
        <td><span class="badge badge-module">${r.module}</span></td>
        <td><strong>${r.testCase}</strong></td>
        <td>${r.steps}</td>
        <td>${r.expectedResult}</td>
        <td>${r.actualResult}</td>
        <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
        <td>${r.executionTimeMs} ms</td>
        <td><span class="badge badge-priority">${r.priority}</span></td>
        <td><span class="badge badge-severity">${r.severity}</span></td>
        <td>${r.tester || summaryData.tester}</td>
        <td>${r.executionDate || summaryData.executionDate}</td>
        <td>${r.screenshotPath && r.screenshotPath !== "N/A" ? `<a href="${r.screenshotPath}" target="_blank">View Screenshot</a>` : "N/A"}</td>
        <td>${r.remarks}</td>
      </tr>
    `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TruthLens AI - Automated QA Test Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --pass-bg: #14532d;
      --pass-text: #4ade80;
      --fail-bg: #7f1d1d;
      --fail-text: #fca5a5;
      --accent: #38bdf8;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .meta {
      color: var(--muted);
      font-size: 14px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .metric-val {
      font-size: 32px;
      font-weight: 800;
      margin-top: 6px;
    }
    .val-pass { color: var(--pass-text); }
    .val-fail { color: var(--fail-text); }
    .val-total { color: var(--accent); }
    .metric-lbl {
      font-size: 13px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    th {
      background-color: #020617;
      color: #cbd5e1;
      font-weight: 700;
      padding: 14px 12px;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tr:hover {
      background-color: rgba(255,255,255,0.02);
    }
    code {
      background: #090d16;
      padding: 3px 6px;
      border-radius: 4px;
      color: #38bdf8;
      font-size: 12px;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 11px;
      display: inline-block;
    }
    .status-pass { background: var(--pass-bg); color: var(--pass-text); }
    .status-fail { background: var(--fail-bg); color: var(--fail-text); }
    .badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      background: rgba(255,255,255,0.06);
      color: #cbd5e1;
    }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🔍 TruthLens AI - Automated QA Test Report</div>
    <div class="meta">Execution Date: ${summaryData.executionDate} | Tester: ${summaryData.tester} | Environment: ${summaryData.environment}</div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-lbl">Total Test Cases</div>
      <div class="metric-val val-total">${summaryData.total}</div>
    </div>
    <div class="metric-card">
      <div class="metric-lbl">Passed</div>
      <div class="metric-val val-pass">${summaryData.passed}</div>
    </div>
    <div class="metric-card">
      <div class="metric-lbl">Failed</div>
      <div class="metric-val val-fail">${summaryData.failed}</div>
    </div>
    <div class="metric-card">
      <div class="metric-lbl">Pass Rate</div>
      <div class="metric-val val-pass">${summaryData.passRate}%</div>
    </div>
    <div class="metric-card">
      <div class="metric-lbl">Execution Duration</div>
      <div class="metric-val" style="color: #a855f7;">${(summaryData.totalTimeMs / 1000).toFixed(2)}s</div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Test Case ID</th>
          <th>Module</th>
          <th>Test Case Title</th>
          <th>Steps</th>
          <th>Expected Result</th>
          <th>Actual Result</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Priority</th>
          <th>Severity</th>
          <th>Tester</th>
          <th>Date</th>
          <th>Screenshot</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${moduleRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, "utf8");
  console.log(`[HtmlReporter] Created HTML report at: ${outputPath}`);
}

module.exports = { generateHtmlReport };
