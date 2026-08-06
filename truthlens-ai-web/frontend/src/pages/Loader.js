import React from "react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";

function Loader() {
  const steps = [
    "Checking uploaded content",
    "Running AI detection engine",
    "Verifying manipulation signals",
    "Generating trust score",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#111827] px-4 pb-28">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/10 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-24 h-24 mx-auto rounded-full border-4 border-cyan-400 flex items-center justify-center mb-8"
        >
          <FaShieldAlt className="text-4xl text-cyan-400" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-3 text-white">
          Analyzing Content
        </h1>

        <p className="text-gray-300 mb-8">
          TruthLens AI is checking your input using multiple verification steps.
        </p>

        <div className="space-y-4 text-left">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0.3, x: -20 }}
              animate={{ opacity: [0.3, 1, 0.3], x: 0 }}
              transition={{
                repeat: Infinity,
                duration: 2,
                delay: index * 0.4,
              }}
              className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl p-4"
            >
              <FaCheckCircle className="text-cyan-400" />
              <span className="text-gray-200">{step}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="h-3 bg-cyan-400 rounded-full mt-8"
        />

        <p className="text-cyan-400 mt-6 animate-pulse">
          Please wait, generating result...
        </p>
      </motion.div>
    </div>
  );
}

export default Loader;