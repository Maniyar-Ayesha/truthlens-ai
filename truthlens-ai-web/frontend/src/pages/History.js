import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import API from "../config/api";

import {
  FaNewspaper,
  FaImage,
  FaVideo,
  FaLink,
  FaTrash,
  FaSearch,
  FaFilter,
  FaChevronLeft,
} from "react-icons/fa";

function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}") || {};
    } catch {
      return {};
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const user = getUser();
      const params = new URLSearchParams();
      if (user.email) params.set("email", user.email);

      const response = await axios.get(
        `${API}/api/history?${params.toString()}`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.records)
        ? response.data.records
        : [];
      setRecords(data);
      setFilteredRecords(data);
    } catch (error) {
      console.log("History error:", error.response?.data || error.message);
      setRecords([]);
      setFilteredRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    let result = records;

    if (filterType !== "All") {
      result = result.filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          filterType.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.type || "").toLowerCase().includes(q) ||
          String(item.explanation || "").toLowerCase().includes(q) ||
          String(item.confidence || "").toLowerCase().includes(q) ||
          String(item.inputText || "").toLowerCase().includes(q)
      );
    }

    setFilteredRecords(result);
  }, [records, search, filterType]);

  const getIcon = (type) => {
    const value = String(type || "").toLowerCase();
    if (value.includes("news")) return <FaNewspaper />;
    if (value.includes("image")) return <FaImage />;
    if (value.includes("video")) return <FaVideo />;
    if (value.includes("url")) return <FaLink />;
    return <FaNewspaper />;
  };

  const getStatusClass = (status) => {
    const value = String(status || "").toUpperCase();
    if (value === "REAL") return "bg-green-500/20 text-green-400";
    if (value === "FAKE") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-300";
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API}/api/history/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setFilteredRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (error) {
      console.log("Delete failed:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to delete record");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setShowDeleteAll(false);
    try {
      const user = getUser();
      await axios.delete(`${API}/api/history`, {
        params: { email: user.email || "guest" },
      });
      setRecords([]);
      setFilteredRecords([]);
    } catch (error) {
      console.log("Clear all failed:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to clear history");
    }
  };

  const handleCardClick = (item) => {
    navigate("/result", { state: item });
  };

  const total = records.length;
  const real = records.filter(
    (item) => String(item.status || item.prediction || "").toUpperCase() === "REAL"
  ).length;
  const fake = records.filter(
    (item) => String(item.status || item.prediction || "").toUpperCase() === "FAKE"
  ).length;
  const uncertain = records.filter(
    (item) =>
      String(item.status || item.prediction || "").toUpperCase() === "UNCERTAIN"
  ).length;

  return (
    <MainLayout>
      <div className="min-h-screen px-4 py-8 pb-28">
        <h1 className="text-4xl font-bold text-center mb-3">
          Analysis History
        </h1>

        <p className="text-center text-gray-400 mb-8">
          Your saved TruthLens AI analysis records
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
          <div className="bg-white/10 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400 text-sm">Total</p>
            <h2 className="text-3xl font-bold text-cyan-400">{total}</h2>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400 text-sm">Real</p>
            <h2 className="text-3xl font-bold text-green-400">{real}</h2>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400 text-sm">Fake</p>
            <h2 className="text-3xl font-bold text-red-400">{fake}</h2>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400 text-sm">Uncertain</p>
            <h2 className="text-3xl font-bold text-yellow-300">
              {uncertain}
            </h2>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white outline-none focus:border-cyan-400"
            >
              <option value="All">All Types</option>
              <option value="News">News</option>
              <option value="Image">Image</option>
              <option value="Video">Video</option>
              <option value="URL">URL</option>
            </select>
          </div>
        </div>

        {/* Delete All Button */}
        {filteredRecords.length > 0 && (
          <div className="max-w-5xl mx-auto flex justify-end mb-4">
            <button
              onClick={() => setShowDeleteAll(true)}
              className="px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-2"
            >
              <FaTrash />
              Delete All
            </button>
          </div>
        )}

        {/* Delete All Confirmation */}
        {showDeleteAll && (
          <div className="max-w-5xl mx-auto mb-4 bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-red-300">
              Are you sure you want to delete all history records?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAll(false)}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-cyan-400">Loading history...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-center text-gray-400">
            {records.length === 0
              ? "No history records found. Run one analysis first."
              : "No records match your search or filter."}
          </p>
        ) : (
          <div className="max-w-5xl mx-auto space-y-5">
            {filteredRecords.map((item, idx) => {
              const status =
                item.status || item.prediction || "UNCERTAIN";
              const type = item.type || "Analysis";
              const confidence = item.confidence || "N/A";
              const explanation = item.explanation || "";
              const createdAt = item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "Recent";

              return (
                <motion.div
                  key={item._id || `history-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 border border-white/10 rounded-3xl p-5 shadow-xl hover:bg-white/15 transition cursor-pointer"
                  onClick={() => handleCardClick(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl flex-shrink-0">
                        {getIcon(type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-white truncate">
                          {type}
                        </h2>

                        <p className="text-gray-400 text-sm">
                          {createdAt}
                        </p>

                        <p className="text-gray-300 mt-2 leading-relaxed line-clamp-2">
                          {explanation ||
                            `Confidence: ${confidence}`}
                        </p>

                        <p className="text-gray-400 text-xs mt-2 truncate">
                          Input:{" "}
                          {item.inputText ||
                            item.checkedUrl ||
                            item.text?.slice(0, 60) ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item._id);
                        }}
                        className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 transition"
                        title="Delete"
                      >
                        {deletingId === item._id ? (
                          <FaTrash className="animate-pulse" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="px-3 py-2 rounded-xl bg-black/30 text-gray-300">
                      Confidence: {confidence}
                    </span>

                    {item.sources_checked && (
                      <span className="px-3 py-2 rounded-xl bg-black/30 text-gray-300">
                        Sources: {item.sources_checked.length || 0}
                      </span>
                    )}

                    {item.key_points && (
                      <span className="px-3 py-2 rounded-xl bg-black/30 text-gray-300">
                        Points: {item.key_points.length || 0}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default History;