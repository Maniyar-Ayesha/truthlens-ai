import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

import MainLayout from "../layouts/MainLayout";
import API from "../config/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveUser = (token, user) => {
    if (!token) {
      alert("Login succeeded but no token was returned. Please try again.");
      return;
    }
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user || {}));
    navigate("/dashboard");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return alert("Please fill all fields");
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API}/api/auth/login`, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      saveUser(res.data.token, res.data.user);
    } catch (error) {
      console.log("Login error:", error.response?.data || error.message);

      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.code === "ERR_NETWORK"
          ? "Cannot reach backend at http://localhost:5000. Make sure the backend is running."
          : "Login failed");
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-black via-[#020617] to-[#071330]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white/10 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl"
        >
          <img
            src="/logo.png"
            alt="TruthLens AI"
            className="w-24 h-24 mx-auto mb-6 rounded-3xl object-cover shadow-lg"
          />

          <h1 className="text-4xl font-bold text-center text-white mb-3">
            TruthLens AI
          </h1>

          <p className="text-center text-gray-400 mb-8">Login to continue</p>

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            autoCapitalize="none"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-5 px-5 py-4 rounded-2xl bg-black/30 border border-gray-700 text-white outline-none focus:border-cyan-400 transition"
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full mb-3 px-5 py-4 rounded-2xl bg-black/30 border border-gray-700 text-white outline-none focus:border-cyan-400 transition"
          />

          <p
            onClick={() => navigate("/forgot-password")}
            className="text-right text-cyan-400 text-sm mb-6 cursor-pointer hover:underline"
          >
            Forgot Password?
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/30 mb-6 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-gray-400">
            Don&apos;t have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-cyan-400 cursor-pointer font-semibold hover:underline"
            >
              Sign Up
            </span>
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default Login;