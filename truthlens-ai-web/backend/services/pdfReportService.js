const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const REPORTS_DIR = path.join(__dirname, "..", "reports");
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

async function generatePdfReport(analysisResult, userEmail = "anonymous") {
  try {
    const pdfDoc = {
      title: "TruthLens AI Analysis Report",
      generatedAt: new Date().toISOString(),
      user: userEmail,
      type: analysisResult.type || "news",
      status: analysisResult.status || "UNCERTAIN",
      confidence: analysisResult.confidence || "0%",
      trustScore: analysisResult.trust_score ?? null,
      riskLevel: analysisResult.riskLevel || "MEDIUM",
      reliability: analysisResult.reliability || "MEDIUM",
      explanation: analysisResult.explanation || "No explanation available.",
      keyPoints: Array.isArray(analysisResult.key_points)
        ? analysisResult.key_points
        : [],
      sourcesChecked: Array.isArray(analysisResult.sources_checked)
        ? analysisResult.sources_checked
        : [],
      processingTimeMs: analysisResult.processing_time_ms ?? null,
    };

    if (analysisResult.fact_check_results) {
      pdfDoc.factCheckResults = analysisResult.fact_check_results;
    }

    if (analysisResult.dataset_matches) {
      pdfDoc.datasetMatches = analysisResult.dataset_matches;
    }

    if (analysisResult.gnews_articles) {
      pdfDoc.gnewsArticles = analysisResult.gnews_articles;
    }

    if (analysisResult.frame_results) {
      pdfDoc.frameResults = analysisResult.frame_results;
    }

    if (analysisResult.checked_url) {
      pdfDoc.checkedUrl = analysisResult.checked_url;
    }

    if (analysisResult.domain_age) {
      pdfDoc.domainAge = analysisResult.domain_age;
    }

    if (analysisResult.ssl_status) {
      pdfDoc.sslStatus = analysisResult.ssl_status;
    }

    if (analysisResult.blacklist_status) {
      pdfDoc.blacklistStatus = analysisResult.blacklist_status;
    }

    const filePath = path.join(
      REPORTS_DIR,
      `report_${Date.now()}_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    );

    await buildPdfFile(pdfDoc, filePath);

    logger.info("PdfReportService", `PDF report generated for ${userEmail} at ${filePath}`);
    return { ...pdfDoc, filePath };
  } catch (error) {
    logger.error("PdfReportService", `PDF generation failed: ${error.message}`);
    throw error;
  }
}

function buildPdfFile(pdfDoc, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text("TruthLens AI - Analysis Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${pdfDoc.generatedAt}`);
    doc.text(`User: ${pdfDoc.user}`);
    doc.text(`Type: ${pdfDoc.type}`);
    doc.moveDown();

    doc.fontSize(14).text("RESULTS", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Status: ${pdfDoc.status}`);
    doc.text(`Confidence: ${pdfDoc.confidence}`);
    if (pdfDoc.trustScore !== null && pdfDoc.trustScore !== undefined) {
      doc.text(`Trust Score: ${pdfDoc.trustScore}/100`);
      doc.text(`Risk Level: ${pdfDoc.riskLevel}`);
      doc.text(`Reliability: ${pdfDoc.reliability}`);
    }
    doc.moveDown();

    doc.fontSize(14).text("EXPLANATION", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(pdfDoc.explanation);
    doc.moveDown();

    doc.fontSize(14).text("KEY POINTS", { underline: true });
    doc.moveDown();
    pdfDoc.keyPoints.forEach((point, i) => {
      doc.fontSize(10).text(`${i + 1}. ${point}`);
    });
    doc.moveDown();

    doc.fontSize(14).text("SOURCES CHECKED", { underline: true });
    doc.moveDown();
    pdfDoc.sourcesChecked.forEach((source) => {
      doc.fontSize(10).text(`• ${source}`);
    });

    if (pdfDoc.factCheckResults && pdfDoc.factCheckResults.length > 0) {
      doc.moveDown();
      doc.fontSize(14).text("FACT CHECK RESULTS", { underline: true });
      doc.moveDown();
      pdfDoc.factCheckResults.forEach((fc) => {
        doc.fontSize(10).text(
          `• "${fc.text || fc.claim || ""}" - ${fc.rating || "Unknown"} (${fc.publisher || "Unknown"})`
        );
      });
    }

    if (pdfDoc.datasetMatches && pdfDoc.datasetMatches.length > 0) {
      doc.moveDown();
      doc.fontSize(14).text("DATASET MATCHES", { underline: true });
      doc.moveDown();
      pdfDoc.datasetMatches.forEach((dm) => {
        doc.fontSize(10).text(
          `• "${dm.title || dm.name || ""}" (${dm.label || "Unknown"}, ${dm.similarity || dm.score || "N/A"}% similar)`
        );
      });
    }

    doc.moveDown();
    doc.fontSize(10).text(`Processing Time: ${pdfDoc.processingTimeMs || "N/A"}ms`);

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

function formatReportForDownload(pdfDoc) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("  TruthLens AI - Analysis Report");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Generated: ${pdfDoc.generatedAt}`);
  lines.push(`User: ${pdfDoc.user}`);
  lines.push(`Type: ${pdfDoc.type}`);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("  RESULTS");
  lines.push("-".repeat(60));
  lines.push(`Status: ${pdfDoc.status}`);
  lines.push(`Confidence: ${pdfDoc.confidence}`);
  if (pdfDoc.trustScore !== null && pdfDoc.trustScore !== undefined) {
    lines.push(`Trust Score: ${pdfDoc.trustScore}/100`);
    lines.push(`Risk Level: ${pdfDoc.riskLevel}`);
    lines.push(`Reliability: ${pdfDoc.reliability}`);
  }
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("  EXPLANATION");
  lines.push("-".repeat(60));
  lines.push(pdfDoc.explanation);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("  KEY POINTS");
  lines.push("-".repeat(60));
  pdfDoc.keyPoints.forEach((point, i) => {
    lines.push(`${i + 1}. ${point}`);
  });
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("  SOURCES CHECKED");
  lines.push("-".repeat(60));
  pdfDoc.sourcesChecked.forEach((source) => {
    lines.push(`• ${source}`);
  });

  if (pdfDoc.factCheckResults && pdfDoc.factCheckResults.length > 0) {
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("  FACT CHECK RESULTS");
    lines.push("-".repeat(60));
    pdfDoc.factCheckResults.forEach((fc) => {
      lines.push(
        `• "${fc.text || fc.claim || ""}" - ${fc.rating || "Unknown"} (${fc.publisher || "Unknown"})`
      );
    });
  }

  if (pdfDoc.datasetMatches && pdfDoc.datasetMatches.length > 0) {
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("  DATASET MATCHES");
    lines.push("-".repeat(60));
    pdfDoc.datasetMatches.forEach((dm) => {
      lines.push(
        `• "${dm.title || dm.name || ""}" (${dm.label || "Unknown"}, ${dm.similarity || dm.score || "N/A"}% similar)`
      );
    });
  }

  lines.push("");
  lines.push("-".repeat(60));
  lines.push(`  Processing Time: ${pdfDoc.processingTimeMs || "N/A"}ms`);
  lines.push("=".repeat(60));

  return lines.join("\n");
}

module.exports = { generatePdfReport, formatReportForDownload };