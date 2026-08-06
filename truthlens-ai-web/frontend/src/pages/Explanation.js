import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";

function Explanation() {
  const location = useLocation();
  const navigate = useNavigate();

  const data = location.state || {};
  const status = (data.status || "UNCERTAIN").toUpperCase();

  const statusColor =
    status === "REAL"
      ? "text-green-400"
      : status === "FAKE"
      ? "text-red-400"
      : "text-yellow-300";

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="text-4xl font-bold text-center mb-6">
            AI Explanation
          </h1>

          <h2 className={`text-3xl font-bold text-center ${statusColor}`}>
            {status}
          </h2>

          <p className="text-center text-gray-300 mb-8">
            Trust Score: {data.confidence || "0%"}
          </p>

          <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
            <h3 className="text-xl font-semibold mb-3">Explanation</h3>
            <p className="text-gray-300">
              {data.explanation || "No explanation available."}
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 mb-5 border border-white/10">
            <h3 className="text-xl font-semibold mb-3">Key Points</h3>
            <ul className="space-y-2">
              {data.key_points?.length > 0 ? (
                data.key_points.map((point, index) => (
                  <li key={index} className="text-gray-300">
                    • {point}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No key points available.</li>
              )}
            </ul>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
            <h3 className="text-xl font-semibold mb-3">Sources Checked</h3>
            <ul className="space-y-2">
              {data.sources_checked?.length > 0 ? (
                data.sources_checked.map((source, index) => (
                  <li key={index} className="text-gray-300 break-words">
                    • {source}
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No sources available.</li>
              )}
            </ul>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-lg font-semibold hover:scale-105 transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default Explanation;