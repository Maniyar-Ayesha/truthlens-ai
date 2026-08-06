import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import jsPDF from "jspdf";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  const data = location.state || {};
  const rawStatus = data.status || data.prediction || "UNCERTAIN";

  const statusMap = {
    SAFE: "REAL",
    SUSPICIOUS: "UNCERTAIN",
    UNSAFE: "FAKE",
  };

  const status = statusMap[rawStatus.toUpperCase()] || rawStatus.toUpperCase();

  const isNews =
    data.ensembleVotes ||
    (Array.isArray(data.dataset_matches) && data.dataset_matches.length > 0) ||
    data.isVideo ||
    data.checked_url ||
    data.domain_age !== undefined;

  const confidenceValue = parseInt(
    String(data.confidence || data.accuracy || "0").replace("%", ""),
    10
  );

  // Always show project confidence bands for every detection type
  const confidenceDisplay =
    status === "REAL"
      ? Math.min(99, Math.max(85, Number.isFinite(confidenceValue) ? confidenceValue : 90))
      : status === "FAKE"
      ? Math.min(35, Math.max(10, Number.isFinite(confidenceValue) ? confidenceValue : 25))
      : Math.min(69, Math.max(50, Number.isFinite(confidenceValue) ? confidenceValue : 55));

  const statusStyles = {
    REAL: {
      bg: "from-green-500 to-emerald-700",
      glow: "shadow-green-500/40",
      text: "text-green-400",
    },
    FAKE: {
      bg: "from-red-500 to-red-700",
      glow: "shadow-red-500/40",
      text: "text-red-400",
    },
    UNCERTAIN: {
      bg: "from-yellow-400 to-yellow-600",
      glow: "shadow-yellow-500/40",
      text: "text-yellow-300",
    },
  };

  const current = statusStyles[status] || statusStyles.UNCERTAIN;

  const downloadReport = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("TruthLens AI Analysis Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Status: ${status}`, 20, 40);
    doc.text(`Confidence: ${data.confidence || data.accuracy || "0%"}`, 20, 50);

    doc.text(
      data.isVideo
        ? `Video Analysis`
        : data.checked_url
        ? `URL Verification`
        : `Analysis`,
      20,
      60
    );

    let y = 80;

    doc.text("Explanation:", 20, y);
    y += 10;
    doc.text(doc.splitTextToSize(data.explanation || "No explanation available.", 170), 20, y);
    y += 10;

    y += 5;
    doc.text("Key Findings:", 20, y);
    y += 10;

    if ((data.key_points || data.keyFindings)?.length > 0) {
      (data.key_points || data.keyFindings).forEach((point) => {
        doc.text(doc.splitTextToSize(`• ${point}`, 170), 20, y);
        y += 10;
      });
    } else {
      doc.text("No key findings available.", 20, y);
      y += 10;
    }

    y += 5;
    doc.text("Sources Checked:", 20, y);
    y += 10;

    if (data.sources_checked?.length > 0) {
      data.sources_checked.forEach((source) => {
        doc.text(doc.splitTextToSize(`• ${source}`, 170), 20, y);
        y += 10;
      });
    } else {
      doc.text("No sources available.", 20, y);
      y += 10;
    }

    if (data.fact_check_results?.length > 0) {
      y += 5;
      doc.text("Fact Check Results:", 20, y);
      y += 10;
      data.fact_check_results.forEach((fc) => {
        doc.text(
          doc.splitTextToSize(
            `• "${fc.text || fc.claim || ""}" - ${fc.rating || "Unknown"} (${fc.publisher || "Unknown"})`,
            170
          ),
          20,
          y
        );
        y += 10;
      });
    }

    if (data.dataset_matches?.length > 0) {
      y += 5;
      doc.text("Dataset Matches:", 20, y);
      y += 10;
      data.dataset_matches.forEach((dm) => {
        doc.text(
          doc.splitTextToSize(
            `• "${dm.title || dm.name || "Untitled"}" (${dm.label || "Unknown"}, ${dm.similarity || dm.score || "N/A"}% similar)`,
            170
          ),
          20,
          y
        );
        y += 10;
      });
    }

    doc.save("TruthLens_AI_Report.pdf");
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`w-full max-w-2xl rounded-3xl backdrop-blur-xl bg-white/10 border border-white/10 p-8 shadow-2xl ${current.glow}`}
        >
          <h1 className="text-4xl font-bold text-white text-center mb-6">
            Analysis Result
          </h1>

          <motion.div
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`mx-auto w-40 h-40 rounded-full bg-gradient-to-r ${current.bg} flex items-center justify-center text-2xl font-bold text-white shadow-2xl mb-6`}
          >
            {status}
          </motion.div>

          <div className="text-center mb-8">
            <h2 className={`text-5xl font-bold ${current.text}`}>
              {confidenceDisplay}%
            </h2>
            <p className="text-gray-400 mt-2">Accuracy Percentage</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3">
              Explanation
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {data.explanation || "No explanation available."}
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3">
              Key Findings
            </h3>

            <ul className="space-y-2">
              {(data.key_points || data.keyFindings) && (data.key_points || data.keyFindings).length > 0 ? (
                (data.key_points || data.keyFindings).map((point, index) => (
                  <li key={index} className="text-gray-300 flex gap-2">
                    <span className={current.text}>●</span>
                    {point}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No key findings available.</li>
              )}
            </ul>
          </div>

          {data.confidenceBreakdown && (
            <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">
                Confidence Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Frame Classifier (CNN)</span>
                  <span className="font-semibold text-white">{data.confidenceBreakdown.cnn}%</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Temporal Consistency</span>
                  <span className="font-semibold text-white">{data.confidenceBreakdown.temporal}%</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Lip Sync Validation</span>
                  <span className="font-semibold text-white">{data.confidenceBreakdown.lipSync}%</span>
                </div>
                <div className="flex justify-between text-gray-300 border-t border-white/10 pt-2 mt-2">
                  <span>Weighted REAL Probability</span>
                  <span className="font-bold text-green-400">{data.confidenceBreakdown.finalReal}%</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Weighted FAKE Probability</span>
                  <span className="font-bold text-red-400">{data.confidenceBreakdown.finalFake}%</span>
                </div>
              </div>
            </div>
          )}

          {data.sources_checked && data.sources_checked.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">
                Sources Checked
              </h3>

              <ul className="space-y-2">
                {data.sources_checked.map((source, index) => (
                  <li key={index} className="text-gray-300 break-words">
                    • {source}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.fact_check_results && data.fact_check_results.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">
                Fact Check Results
              </h3>

              <ul className="space-y-2">
                {data.fact_check_results.map((fc, index) => (
                  <li key={index} className="text-gray-300 break-words">
                    • &quot;{fc.text?.slice(0, 100) || fc.claim?.slice(0, 100) || "Unknown claim"}&quot; - {fc.rating || "Unknown"} ({fc.publisher || "Unknown"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.dataset_matches && data.dataset_matches.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">
                Dataset Matches
              </h3>

              <ul className="space-y-2">
                {data.dataset_matches.map((dm, index) => (
                  <li key={index} className="text-gray-300 break-words">
                    • {dm.title || dm.name || "Untitled"} ({dm.label || "Unknown"}, {dm.similarity || dm.score || "N/A"}% similar)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={downloadReport}
            className="w-full py-4 rounded-2xl bg-white/10 border border-white/10 text-white text-lg font-semibold hover:bg-white/20 transition-all duration-300 mb-4"
          >
            Download PDF Report
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${current.bg} text-white text-lg font-semibold hover:scale-105 transition-all duration-300`}
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default Result;