const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generatePdfReport(results, summaryData, outputPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Title / Header
    doc
      .rect(40, 40, 515, 60)
      .fill("#1e293b");

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#ffffff")
      .text("TRUTHLENS AI - AUTOMATED QA REPORT", 55, 55);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#94a3b8")
      .text(`Execution Date: ${summaryData.executionDate} | Environment: ${summaryData.environment}`, 55, 78);

    doc.moveDown(3);

    // Executive Summary Table
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0f172a")
      .text("Executive Summary KPIs");
    doc.moveDown(0.5);

    const summaryTableTop = 135;
    const kpis = [
      { label: "Total Test Cases", val: String(summaryData.total) },
      { label: "Passed Cases", val: String(summaryData.passed) },
      { label: "Failed Cases", val: String(summaryData.failed) },
      { label: "Skipped Cases", val: String(summaryData.skipped) },
      { label: "Pass Percentage", val: `${summaryData.passRate}%` },
      { label: "Execution Time", val: `${(summaryData.totalTimeMs / 1000).toFixed(2)} sec` },
    ];

    doc.fontSize(10);
    kpis.forEach((item, i) => {
      const y = summaryTableTop + i * 22;
      doc
        .rect(40, y, 250, 20)
        .fill("#f8fafc")
        .strokeColor("#e2e8f0")
        .stroke();
      doc
        .fillColor("#334155")
        .font("Helvetica-Bold")
        .text(item.label, 50, y + 5);

      doc
        .rect(290, y, 265, 20)
        .fill("#ffffff")
        .strokeColor("#e2e8f0")
        .stroke();
      doc
        .fillColor(item.label === "Passed Cases" ? "#16a34a" : item.label === "Failed Cases" && summaryData.failed > 0 ? "#dc2626" : "#0f172a")
        .font("Helvetica")
        .text(item.val, 300, y + 5);
    });

    doc.moveDown(9);

    // Test Results Summary Table
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0f172a")
      .text("Detailed Test Suite Execution");
    doc.moveDown(0.5);

    let y = doc.y;
    // Table Header
    doc
      .rect(40, y, 515, 20)
      .fill("#334155");

    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("ID", 45, y + 5, { width: 50 });
    doc.text("Module", 100, y + 5, { width: 90 });
    doc.text("Test Case", 195, y + 5, { width: 170 });
    doc.text("Status", 370, y + 5, { width: 60 });
    doc.text("Time (ms)", 440, y + 5, { width: 50 });
    doc.text("Severity", 500, y + 5, { width: 50 });

    y += 20;

    doc.font("Helvetica").fontSize(8);
    results.slice(0, 25).forEach((r, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }

      const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.rect(40, y, 515, 18).fill(bg).strokeColor("#f1f5f9").stroke();

      doc.fillColor("#334155").text(r.testCaseId, 45, y + 4, { width: 50 });
      doc.fillColor("#334155").text(r.module.substring(0, 16), 100, y + 4, { width: 90 });
      doc.fillColor("#334155").text(r.testCase.substring(0, 32), 195, y + 4, { width: 170 });

      const statusColor = r.status === "PASS" ? "#15803d" : r.status === "FAIL" ? "#b91c1c" : "#d97706";
      doc.fillColor(statusColor).font("Helvetica-Bold").text(r.status, 370, y + 4, { width: 60 });

      doc.font("Helvetica").fillColor("#475569").text(String(r.executionTimeMs), 440, y + 4, { width: 50 });
      doc.fillColor("#475569").text(r.severity || "Medium", 500, y + 4, { width: 50 });

      y += 18;
    });

    if (results.length > 25) {
      y += 10;
      doc.fillColor("#64748b").font("Helvetica-Oblique").text(`... and ${results.length - 25} more test cases in full report Excel file.`, 45, y);
    }

    doc.end();

    stream.on("finish", () => {
      console.log(`[PDFReporter] Created PDF report at: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on("error", (err) => reject(err));
  });
}

module.exports = { generatePdfReport };
