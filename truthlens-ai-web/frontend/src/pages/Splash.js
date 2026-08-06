import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import MainLayout from "../layouts/MainLayout";

function Splash() {

  const navigate = useNavigate();

  return (

    <MainLayout
      showNavbar={false}
      showFooter={false}
    >

      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-[#020617] to-[#071330] overflow-hidden">

        <motion.div

          initial={{
            opacity: 0,
            scale: 0.85,
            y: 40,
          }}

          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}

          transition={{
            duration: 0.7,
          }}

          className="text-center max-w-3xl relative"

        >

          {/* GLOW */}

          <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full"></div>

          {/* LOGO */}

          <motion.img

            initial={{
              rotate: -10,
              opacity: 0,
            }}

            animate={{
              rotate: 0,
              opacity: 1,
            }}

            transition={{
              duration: 0.7,
            }}

            src="/logo.png"

            alt="TruthLens AI"

            className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-8 rounded-3xl shadow-2xl relative z-10"

          />

          {/* TITLE */}

          <motion.h1

            initial={{
              opacity: 0,
              y: -20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.2,
            }}

            className="text-5xl md:text-7xl font-bold mb-6 text-white relative z-10"

          >

            TruthLens AI

          </motion.h1>

          {/* SUBTITLE */}

          <motion.p

            initial={{
              opacity: 0,
            }}

            animate={{
              opacity: 1,
            }}

            transition={{
              delay: 0.4,
            }}

            className="text-lg md:text-2xl text-gray-300 mb-10 leading-relaxed relative z-10"

          >

            AI-powered Fake News,
            Deepfake Image, Video
            and URL Detection System

          </motion.p>

          {/* BUTTON */}

          <motion.button

            whileHover={{
              scale: 1.05,
            }}

            whileTap={{
              scale: 0.95,
            }}

            onClick={() =>
              navigate("/login")
            }

            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold shadow-lg shadow-cyan-500/30 relative z-10"

          >

            Get Started

          </motion.button>

        </motion.div>

      </div>

    </MainLayout>

  );

}

export default Splash;