import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import apiClient, { getStoredUser } from "../config/apiClient";

function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const type = params.get("type");

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [url, setUrl] = useState("");

  const saveHistory = async (analysisType, data) => {
    try {
      const user = getStoredUser();
      let inputText = "";
      if (analysisType === "News") inputText = text;
      if (analysisType === "URL") inputText = url;

      await apiClient.post(`/api/history`, {
        email: user.email || "guest",
        type: analysisType,
        inputText,
        ...data,
      });
    } catch (error) {
      console.log("History save failed:", error.response?.data || error.message);
    }
  };

  const goToResult = async (analysisType, data) => {
    await saveHistory(analysisType, data);
    setTimeout(() => navigate("/result", { state: data }), 1200);
  };

  const analyzeNews = async () => {
    if (!text.trim()) return alert("Please enter news text");
    navigate("/loader");

    try {
      const response = await apiClient.post(`/api/check-news`, { text });
      goToResult("News", response.data);
    } catch {
      alert("News analysis failed");
      navigate("/home?type=news");
    }
  };

  const analyzeImage = async () => {
    if (!image) return alert("Please upload image");

    const formData = new FormData();
    formData.append("image", image);

    navigate("/loader");

    try {
      const response = await apiClient.post(`/api/check-image`, formData);
      goToResult("Image", response.data);
    } catch {
      alert("Image analysis failed");
      navigate("/home?type=image");
    }
  };

  const analyzeVideo = async () => {
    if (!video) return alert("Please upload video");

    const formData = new FormData();
    formData.append("video", video);

    navigate("/loader");

    try {
      const response = await apiClient.post(`/api/check-video`, formData, {
        timeout: 300000,
      });
      goToResult("Video", response.data);
    } catch (error) {
      alert(error.response?.data?.message || "Video analysis failed");
      navigate("/home?type=video");
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return alert("Please enter URL");
    navigate("/loader");

    try {
      const response = await apiClient.post(`/api/check-url`, { url });
      goToResult("URL", response.data);
    } catch (error) {
      alert(error.response?.data?.error || error.response?.data?.message || "URL analysis failed");
      navigate("/home?type=url");
    }
  };

  const titles = {
    news: "Fake News Detection",
    image: "Image Deepfake Detection",
    video: "Video Deepfake Detection",
    url: "URL Verification",
  };

  const buttonColors = {
    news: "from-blue-500 to-cyan-500",
    image: "from-pink-500 to-red-500",
    video: "from-purple-500 to-indigo-500",
    url: "from-green-500 to-emerald-500",
  };

  const loadSampleFakeNews = () => {
    setText(
      "Breaking: Scientists confirm aliens landed in Chennai yesterday and met government officials secretly."
    );
  };

  const loadSampleRealNews = () => {
    setText(
      "The Indian Space Research Organisation successfully launched a weather satellite to improve climate monitoring and disaster prediction."
    );
  };

  const loadFakeUrl = () => {
    setUrl("http://breaking-news-free-money.xyz");
  };

  const loadRealUrl = () => {
    setUrl("https://www.bbc.com");
  };

  const featureOptions = [
    {
      type: "news",
      title: "Fake News Detection",
      color: "from-blue-500 to-cyan-500",
    },
    {
      type: "image",
      title: "Image Deepfake Detection",
      color: "from-pink-500 to-red-500",
    },
    {
      type: "video",
      title: "Video Deepfake Detection",
      color: "from-purple-500 to-indigo-500",
    },
    {
      type: "url",
      title: "URL Verification",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl rounded-3xl p-8 backdrop-blur-xl bg-white/10 border border-white/10 shadow-2xl"
        >
          <h1 className="text-5xl font-bold text-center mb-3">TruthLens AI</h1>

          <p className="text-center text-gray-400 mb-10">
            AI-powered Fake News & Deepfake Detection System
          </p>

          <h2 className="text-3xl font-semibold text-center mb-8">
            {titles[type] || "Select Feature"}
          </h2>

          {!type && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featureOptions.map((feature) => (
                <button
                  key={feature.type}
                  onClick={() => navigate(`/home?type=${feature.type}`)}
                  className={`w-full py-5 px-4 rounded-2xl bg-gradient-to-r ${feature.color} text-white font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-lg`}
                >
                  {feature.title}
                </button>
              ))}
            </div>
          )}

          {type === "news" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <button
                  onClick={loadSampleFakeNews}
                  className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold"
                >
                  Try Sample Fake News
                </button>

                <button
                  onClick={loadSampleRealNews}
                  className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold"
                >
                  Try Sample Real News
                </button>
              </div>

              <textarea
                placeholder="Paste news article..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-48 bg-black/30 border border-gray-700 rounded-2xl p-5 text-white outline-none focus:border-blue-500 mb-6"
              />

              <button
                onClick={analyzeNews}
                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${buttonColors.news} text-white font-semibold text-lg hover:scale-105 transition-all duration-300`}
              >
                Analyze News
              </button>
            </>
          )}

          {type === "image" && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                className="w-full bg-black/30 border border-gray-700 rounded-2xl p-4 text-white mb-6"
              />

              <button
                onClick={analyzeImage}
                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${buttonColors.image} text-white font-semibold text-lg hover:scale-105 transition-all duration-300`}
              >
                Analyze Image
              </button>
            </>
          )}

          {type === "video" && (
            <>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files[0])}
                className="w-full bg-black/30 border border-gray-700 rounded-2xl p-4 text-white mb-6"
              />

              <p className="text-gray-400 text-sm mb-5">
                Upload MP4 video under 50 MB for faster analysis.
              </p>

              <button
                onClick={analyzeVideo}
                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${buttonColors.video} text-white font-semibold text-lg hover:scale-105 transition-all duration-300`}
              >
                Analyze Video
              </button>
            </>
          )}

          {type === "url" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <button
                  onClick={loadFakeUrl}
                  className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold"
                >
                  Try Suspicious URL
                </button>

                <button
                  onClick={loadRealUrl}
                  className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold"
                >
                  Try Trusted URL
                </button>
              </div>

              <input
                type="text"
                placeholder="Enter URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-black/30 border border-gray-700 rounded-2xl p-4 text-white outline-none focus:border-green-500 mb-6"
              />

              <button
                onClick={analyzeUrl}
                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${buttonColors.url} text-white font-semibold text-lg hover:scale-105 transition-all duration-300`}
              >
                Analyze URL
              </button>
            </>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default Home;