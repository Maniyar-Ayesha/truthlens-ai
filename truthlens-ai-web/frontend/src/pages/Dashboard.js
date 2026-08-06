import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  FaNewspaper,
  FaImage,
  FaVideo,
  FaLink,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import apiClient, { getStoredUser } from "../config/apiClient";

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user.email) return;

    apiClient
      .get(`/api/dashboard/stats/${encodeURIComponent(user.email)}`)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  const cards = [
    {
      title: "Image Deepfake Detection",
      description: "Analyze manipulated or AI-generated images in real time.",
      type: "image",
      icon: <FaImage size={40} />,
      color: "from-pink-500 to-red-500",
    },
    {
      title: "Fake News Detection",
      description: "Detect misinformation and AI-generated fake news instantly.",
      type: "news",
      icon: <FaNewspaper size={40} />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Video Deepfake Detection",
      description: "Scan videos for deepfake manipulation using AI detection.",
      type: "video",
      icon: <FaVideo size={40} />,
      color: "from-purple-500 to-indigo-500",
    },
    {
      title: "URL Verification",
      description: "Verify suspicious links and detect unsafe websites instantly.",
      type: "url",
      icon: <FaLink size={40} />,
      color: "from-green-500 to-emerald-500",
    },
  ];

  const statItems = [
    { label: "Total Analysis", value: stats?.totalAnalysis ?? 0 },
    { label: "Fake Count", value: stats?.fakeNews ?? 0 },
    { label: "Real Count", value: stats?.realNews ?? 0 },
    { label: "News", value: stats?.newsChecked ?? 0 },
    { label: "Images", value: stats?.imagesChecked ?? 0 },
    { label: "Videos", value: stats?.videosChecked ?? 0 },
    { label: "URLs", value: stats?.urlsChecked ?? 0 },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen px-6 py-10 pb-28">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold text-center mb-4"
        >
          TruthLens AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-400 mb-10 text-lg"
        >
          AI-powered Fake News & Deepfake Detection System
        </motion.p>

        <div className="flex justify-center mb-10">
          <span className="px-5 py-2 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 text-sm font-semibold">
            Version 1.0 • Final Year AI Project
          </span>
        </div>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mb-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3"
          >
            {statItems.map((item) => (
              <div
                key={item.label}
                className="bg-white/10 border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-center"
              >
                <p className="text-2xl font-bold text-cyan-400">{item.value}</p>
                <p className="text-xs text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/home?type=${card.type}`)}
              className={`cursor-pointer rounded-3xl p-10 bg-gradient-to-r ${card.color} shadow-2xl hover:shadow-cyan-500/30 transition-all duration-300 relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-all" />
              <div className="mb-6">{card.icon}</div>
              <h2 className="text-3xl font-bold mb-4">{card.title}</h2>
              <p className="text-white/90 text-lg leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;
