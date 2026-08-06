import React, { useState } from "react";
import axios from "axios";
import API from "../config/api";
import MainLayout from "../layouts/MainLayout";

function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) return alert("Enter your email");

    try {
      const res = await axios.post(`${API}/api/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      });

      alert(res.data.message || "Reset link sent to your email");
    } catch (error) {
      console.log("Forgot error:", error.response?.data || error.message);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to send reset link"
      );
    }
  };

  return (
    <MainLayout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-black via-[#020617] to-[#071330]">
        <div className="w-full max-w-md bg-white/10 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Forgot Password
          </h1>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full p-4 rounded-2xl bg-black/30 border border-gray-700 mb-5 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-cyan-500 font-bold"
          >
            Send Reset Link
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

export default ForgotPassword;