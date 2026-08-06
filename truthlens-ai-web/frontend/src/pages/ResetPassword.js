import React, { useState } from "react";
import axios from "axios";
import {
  useParams,
  useNavigate,
} from "react-router-dom";

import API from "../config/api";
import MainLayout from "../layouts/MainLayout";

function ResetPassword() {

  const { token } = useParams();

  const navigate = useNavigate();

  const [password, setPassword] =
    useState("");

  const [confirmPassword,
    setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // RESET PASSWORD

  const handleReset = async () => {

    if (!password.trim()) {

      return alert(
        "Enter new password"
      );

    }

    if (password.length < 6) {

      return alert(
        "Password must be at least 6 characters"
      );

    }

    if (
      password !== confirmPassword
    ) {

      return alert(
        "Passwords do not match"
      );

    }

    try {

      setLoading(true);

      const res =
        await axios.post(

          `${API}/api/auth/reset-password/${token}`,

          {
            password:
              password.trim(),
          }

        );

      alert(
        res.data.message ||
        "Password reset successful"
      );

      navigate("/login");

    } catch (error) {

      console.log(
        "Reset password error:",
        error.response?.data ||
        error.message
      );

      alert(

        error.response?.data?.message ||

        "Reset failed"

      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <MainLayout
      showNavbar={false}
      showFooter={false}
    >

      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-black via-[#020617] to-[#071330]">

        <div className="w-full max-w-md bg-white/10 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">

          {/* TITLE */}

          <h1 className="text-3xl font-bold mb-3 text-center text-white">

            Reset Password

          </h1>

          <p className="text-center text-gray-400 mb-8">

            Create your new password

          </p>

          {/* PASSWORD */}

          <input

            type="password"

            placeholder="Enter new password"

            className="w-full p-4 rounded-2xl bg-black/30 border border-gray-700 mb-5 text-white outline-none focus:border-cyan-400"

            value={password}

            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }

          />

          {/* CONFIRM PASSWORD */}

          <input

            type="password"

            placeholder="Confirm new password"

            className="w-full p-4 rounded-2xl bg-black/30 border border-gray-700 mb-6 text-white outline-none focus:border-cyan-400"

            value={confirmPassword}

            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }

          />

          {/* BUTTON */}

          <button

            onClick={handleReset}

            disabled={loading}

            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:scale-105 transition-all duration-300 disabled:opacity-60"

          >

            {loading
              ? "Resetting..."
              : "Reset Password"}

          </button>

        </div>

      </div>

    </MainLayout>
  );
}

export default ResetPassword;