/**
 * TruthLens AI – Report Controller
 * Generate and download PDF reports for analysis results.
 */
const path = require("path");
const fs = require("fs");
const { generatePdfReport, formatReportForDownload } = require("../services/pdfReportService");
const logger = require("../utils/logger");

async function generateReport(req, res, next) {
  try {
    const analysisResult = req.body;
    const userEmail = req.body.userEmail || req.user?.email || "anonymous";
    const result = await generatePdfReport(analysisResult, userEmail);
    res.json({ success: true, report: result });
  } catch (error) {
    logger.error("ReportController", error.message);
    next(error);
  }
}

async function downloadReport(req, res, next) {
  try {
    const { filename } = req.params;
    const reportsDir = path.join(__dirname, "..", "reports");
    const filePath = path.join(reportsDir, filename);

    if (!filename.endsWith(".pdf")) {
      return res.status(400).json({ success: false, message: "Invalid report file." });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error("ReportController", `Download failed: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Download failed." });
        }
      }
    });
  } catch (error) {
    logger.error("ReportController", error.message);
    next(error);
  }
}

module.exports = { generateReport, downloadReport };
