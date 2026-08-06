const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function generateExcelReport(results, summaryData, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TruthLens AI Automated QA Suite";
  workbook.lastModifiedBy = "TruthLens AI QA Runner";
  workbook.created = new Date();

  // Color Palette
  const NAVY_HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  const WHITE_BOLD_FONT = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  const BORDER_STYLE = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } },
  };

  const PASS_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
  const PASS_FONT = { name: "Arial", size: 10, bold: true, color: { argb: "FF15803D" } };

  const FAIL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
  const FAIL_FONT = { name: "Arial", size: 10, bold: true, color: { argb: "FFB91C1C" } };

  const SKIP_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
  const SKIP_FONT = { name: "Arial", size: 10, bold: true, color: { argb: "FF9F1239" } };

  // 1. SUMMARY SHEET
  const summarySheet = workbook.addWorksheet("Summary", { views: [{ showGridLines: true }] });
  
  // Title
  summarySheet.mergeCells("B2:G3");
  const titleCell = summarySheet.getCell("B2");
  titleCell.value = "TRUTHLENS AI - AUTOMATED QA TEST EXECUTION REPORT";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = NAVY_HEADER_FILL;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Subtitle / Meta
  summarySheet.mergeCells("B4:G4");
  const metaCell = summarySheet.getCell("B4");
  metaCell.value = `Execution Date: ${summaryData.executionDate} | Tester: ${summaryData.tester} | Environment: ${summaryData.environment}`;
  metaCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };

  // KPI Metrics Table
  const metrics = [
    ["Metric", "Value"],
    ["Total Test Cases", summaryData.total],
    ["Passed Test Cases", summaryData.passed],
    ["Failed Test Cases", summaryData.failed],
    ["Skipped Test Cases", summaryData.skipped],
    ["Pass Percentage", `${summaryData.passRate}%`],
    ["Fail Percentage", `${summaryData.failRate}%`],
    ["Total Execution Time", `${(summaryData.totalTimeMs / 1000).toFixed(2)} seconds`],
    ["API Base URL", summaryData.baseUrl],
    ["Target Platform", "Web (React) + Mobile (Android Expo)"],
  ];

  let startRow = 6;
  metrics.forEach((row, idx) => {
    const r = summarySheet.getRow(startRow + idx);
    r.getCell(2).value = row[0];
    r.getCell(3).value = row[1];

    if (idx === 0) {
      r.getCell(2).fill = NAVY_HEADER_FILL;
      r.getCell(2).font = WHITE_BOLD_FONT;
      r.getCell(3).fill = NAVY_HEADER_FILL;
      r.getCell(3).font = WHITE_BOLD_FONT;
    } else {
      r.getCell(2).font = { name: "Arial", size: 10, bold: true };
      r.getCell(3).font = { name: "Arial", size: 10 };

      if (row[0] === "Passed Test Cases") {
        r.getCell(3).font = PASS_FONT;
        r.getCell(3).fill = PASS_FILL;
      } else if (row[0] === "Failed Test Cases" && summaryData.failed > 0) {
        r.getCell(3).font = FAIL_FONT;
        r.getCell(3).fill = FAIL_FILL;
      } else if (row[0] === "Pass Percentage") {
        r.getCell(3).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0284C7" } };
      }
    }
    r.getCell(2).border = BORDER_STYLE;
    r.getCell(3).border = BORDER_STYLE;
  });

  // Module Summary Table
  const modHeaderRow = summarySheet.getRow(18);
  modHeaderRow.getCell(2).value = "Module Name";
  modHeaderRow.getCell(3).value = "Total Cases";
  modHeaderRow.getCell(4).value = "Passed";
  modHeaderRow.getCell(5).value = "Failed";
  modHeaderRow.getCell(6).value = "Pass %";

  [2, 3, 4, 5, 6].forEach((colIdx) => {
    modHeaderRow.getCell(colIdx).fill = NAVY_HEADER_FILL;
    modHeaderRow.getCell(colIdx).font = WHITE_BOLD_FONT;
    modHeaderRow.getCell(colIdx).border = BORDER_STYLE;
    modHeaderRow.getCell(colIdx).alignment = { horizontal: "center" };
  });

  const moduleStats = summaryData.moduleStats || {};
  let modRowIdx = 19;
  Object.keys(moduleStats).forEach((modName) => {
    const stat = moduleStats[modName];
    const r = summarySheet.getRow(modRowIdx);
    r.getCell(2).value = modName;
    r.getCell(3).value = stat.total;
    r.getCell(4).value = stat.passed;
    r.getCell(5).value = stat.failed;
    const rate = stat.total > 0 ? ((stat.passed / stat.total) * 100).toFixed(1) + "%" : "0%";
    r.getCell(6).value = rate;

    [2, 3, 4, 5, 6].forEach((colIdx) => {
      r.getCell(colIdx).font = { name: "Arial", size: 10 };
      r.getCell(colIdx).border = BORDER_STYLE;
    });
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(5).alignment = { horizontal: "center" };
    r.getCell(6).alignment = { horizontal: "center" };
    modRowIdx++;
  });

  summarySheet.getColumn(2).width = 28;
  summarySheet.getColumn(3).width = 28;
  summarySheet.getColumn(4).width = 16;
  summarySheet.getColumn(5).width = 16;
  summarySheet.getColumn(6).width = 16;

  // DEFINITION OF SHEETS TO GENERATE
  const sheetDefinitions = [
    { name: "All Scenarios", filter: () => true },
    { name: "Unit & API", filter: (r) => r.module.includes("API") || r.module.includes("Backend") },
    { name: "Login", filter: (r) => r.module.includes("Login") || r.testCaseId.includes("LOG") },
    { name: "Signup", filter: (r) => r.module.includes("Signup") || r.testCaseId.includes("SUP") },
    { name: "Navigation", filter: (r) => r.module.includes("Navigation") || r.testCaseId.includes("NAV") },
    { name: "AI Modules", filter: (r) => r.module.includes("AI") || r.module.includes("Detection") || r.testCaseId.includes("AI") },
    { name: "Web UI", filter: (r) => r.module.includes("Web") || r.testCaseId.includes("WEB") },
    { name: "Android UI", filter: (r) => r.module.includes("Android") || r.module.includes("Mobile") || r.testCaseId.includes("MOB") },
    { name: "Load Testing", filter: (r) => r.module.includes("Performance") || r.module.includes("Load") || r.testCaseId.includes("PERF") },
    { name: "Security", filter: (r) => r.module.includes("Security") || r.testCaseId.includes("SEC") },
    { name: "Validation", filter: (r) => r.module.includes("Validation") || r.testCaseId.includes("VAL") },
  ];

  const headers = [
    "S.No",
    "Test Case ID",
    "Module",
    "Test Case",
    "Steps",
    "Expected Result",
    "Actual Result",
    "Status",
    "Execution Time (ms)",
    "Priority",
    "Severity",
    "Tester",
    "Execution Date",
    "Screenshot Path",
    "Remarks",
  ];

  sheetDefinitions.forEach((sheetDef) => {
    const sheet = workbook.addWorksheet(sheetDef.name, { views: [{ showGridLines: true }] });
    const filtered = results.filter(sheetDef.filter);

    // Header Row
    const headerRow = sheet.getRow(1);
    headers.forEach((h, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = h;
      cell.fill = NAVY_HEADER_FILL;
      cell.font = WHITE_BOLD_FONT;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER_STYLE;
    });
    headerRow.height = 24;

    // Data Rows
    filtered.forEach((tc, idx) => {
      const row = sheet.getRow(idx + 2);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = tc.testCaseId;
      row.getCell(3).value = tc.module;
      row.getCell(4).value = tc.testCase;
      row.getCell(5).value = tc.steps;
      row.getCell(6).value = tc.expectedResult;
      row.getCell(7).value = tc.actualResult;
      row.getCell(8).value = tc.status;
      row.getCell(9).value = tc.executionTimeMs;
      row.getCell(10).value = tc.priority;
      row.getCell(11).value = tc.severity;
      row.getCell(12).value = tc.tester || summaryData.tester;
      row.getCell(13).value = tc.executionDate || summaryData.executionDate;
      row.getCell(14).value = tc.screenshotPath || "N/A";
      row.getCell(15).value = tc.remarks || "Clean execution";

      // Formatting
      for (let c = 1; c <= 15; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 9 };
        cell.border = BORDER_STYLE;
        cell.alignment = { vertical: "middle" };
      }

      // Center short columns
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };

      // Status Coloring
      const statusCell = row.getCell(8);
      if (tc.status === "PASS") {
        statusCell.fill = PASS_FILL;
        statusCell.font = PASS_FONT;
      } else if (tc.status === "FAIL") {
        statusCell.fill = FAIL_FILL;
        statusCell.font = FAIL_FONT;
      } else {
        statusCell.fill = SKIP_FILL;
        statusCell.font = SKIP_FONT;
      }
    });

    // Auto-fit widths
    const colWidths = [6, 14, 18, 30, 35, 30, 30, 10, 18, 10, 10, 14, 14, 25, 25];
    colWidths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });
  });

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await workbook.xlsx.writeFile(outputPath);
  console.log(`[ExcelReporter] Created Excel report at: ${outputPath}`);
}

module.exports = { generateExcelReport };
