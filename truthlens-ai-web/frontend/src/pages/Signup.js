import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

import MainLayout from "../layouts/MainLayout";
import API from "../config/api";

function Signup() {

  const navigate = useNavigate();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // SIGNUP

  const handleSignup = async () => {

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim()
    ) {

      return alert(
        "Please fill all fields"
      );

    }

    if (password.length < 6) {

      return alert(
        "Password must be at least 6 characters"
      );

    }

    try {

      setLoading(true);

      const res =
        await axios.post(

          `${API}/api/auth/signup`,

          {
            name: name.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            password:
              password.trim(),
          }

        );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
        )
      );

      navigate("/dashboard");

    } catch (error) {

      console.log(
        "Signup error:",
        error.response?.data ||
        error.message
      );

      alert(
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot reach backend at http://localhost:5000. Make sure the backend is running."
          : "Signup failed")
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

        <motion.div

          initial={{
            opacity: 0,
            scale: 0.9,
            y: 30,
          }}

          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}

          transition={{
            duration: 0.5,
          }}

          className="

            w-full
            max-w-md
            bg-white/10
            border
            border-white/10
            backdrop-blur-xl
            rounded-3xl
            p-8
            shadow-2xl

          "

        >

          {/* LOGO */}

          <img

            src="/logo.png"

            alt="logo"

            className="

              w-24
              h-24
              mx-auto
              mb-6
              rounded-3xl
              object-cover
              shadow-lg

            "

          />

          {/* TITLE */}

          <h1 className="text-4xl font-bold text-center text-white mb-3">

            Create Account

          </h1>

          <p className="text-center text-gray-400 mb-8">

            Join TruthLens AI

          </p>

          {/* NAME */}

          <input

            type="text"

            placeholder="Enter Name"

            value={name}

            onChange={(e) =>
              setName(
                e.target.value
              )
            }

            className="w-full mb-5 px-5 py-4 rounded-2xl bg-black/30 border border-gray-700 text-white outline-none focus:border-cyan-400"

          />

          {/* EMAIL */}

          <input

            type="email"

            placeholder="Enter Email"

            value={email}

            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }

            className="w-full mb-5 px-5 py-4 rounded-2xl bg-black/30 border border-gray-700 text-white outline-none focus:border-cyan-400"

          />

          {/* PASSWORD */}

          <input

            type="password"

            placeholder="Enter Password"

            value={password}

            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }

            className="w-full mb-6 px-5 py-4 rounded-2xl bg-black/30 border border-gray-700 text-white outline-none focus:border-cyan-400"

          />

          {/* SIGNUP BUTTON */}

          <button

            onClick={handleSignup}

            disabled={loading}

            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg mb-6 hover:scale-105 transition-all duration-300 disabled:opacity-60"

          >

            {loading
              ? "Creating Account..."
              : "Sign Up"}

          </button>

          {/* LOGIN */}

          <p className="text-center text-gray-400">

            Already have an account?{" "}

            <span

              onClick={() =>
                navigate("/login")
              }

              className="text-cyan-400 cursor-pointer font-semibold hover:underline"

            >

              Login

            </span>

          </p>

        </motion.div>

      </div>

    </MainLayout>
  );
}

export default Signup;