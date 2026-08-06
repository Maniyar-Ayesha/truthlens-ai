import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import API from "../config/api";

function Chat() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello 👋 I am TruthLens AI Assistant. Ask me about fake news, deepfakes, suspicious URLs, or AI-generated images.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const currentMessage = message.trim();

    if (!currentMessage) return;

    const userMessage = {
      sender: "user",
      text: currentMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      let user = {};
      try {
        user = JSON.parse(localStorage.getItem("user") || "{}") || {};
      } catch {
        user = {};
      }

      const history = messages
        .filter((m) => m.sender === "user" || m.sender === "ai")
        .slice(-10)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const response = await axios.post(`${API}/api/chat`, {
        message: currentMessage,
        history,
        email: user.email || null,
      });

      const aiReply = {
        sender: "ai",
        text: response.data.reply || "No reply received.",
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (error) {
      console.log("Chat error:", error.response?.data || error.message);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            error.response?.data?.reply ||
            error.response?.data?.message ||
            "Sorry, AI chat failed. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col px-4 py-8 pb-28">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-center mb-4"
        >
          AI Chat Assistant
        </motion.h1>

        <p className="text-center text-gray-400 mb-8">
          Ask questions about fake news, deepfakes, and online safety.
        </p>

        <div className="flex-1 max-w-4xl mx-auto w-full bg-white/10 border border-white/10 rounded-3xl backdrop-blur-xl p-4 md:p-6 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-6 max-h-[500px] pr-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] px-5 py-4 rounded-2xl text-white whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-cyan-500 ml-auto"
                    : "bg-gray-800"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="bg-gray-800 max-w-[85%] px-5 py-4 rounded-2xl text-cyan-400 animate-pulse">
                TruthLens AI is thinking...
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Ask something..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-black/30 border border-gray-700 rounded-2xl px-5 py-4 text-white outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleSend}
              disabled={loading}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold hover:scale-105 transition-all disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Chat;