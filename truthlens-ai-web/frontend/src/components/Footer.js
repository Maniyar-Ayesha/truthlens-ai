import React from "react";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
} from "react-icons/fa";

function Footer() {
  return (
    <footer className="w-full mt-20 border-t border-white/10 bg-black/20 backdrop-blur-xl">

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* TOP */}

        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* LEFT */}

          <div>

            <h1 className="text-3xl font-bold mb-2">
              TruthLens AI
            </h1>

            <p className="text-gray-400 max-w-md">
              AI-powered Fake News and Deepfake
              Detection System for identifying
              manipulated content across news,
              images, videos, and URLs.
            </p>

          </div>

          {/* RIGHT */}

          <div className="flex gap-5 text-2xl">

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-all duration-300"
            >
              <FaGithub />
            </a>

            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-all duration-300"
            >
              <FaLinkedin />
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-all duration-300"
            >
              <FaInstagram />
            </a>

          </div>

        </div>

        {/* BOTTOM */}

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-gray-500 text-sm">

          © 2026 TruthLens AI. All rights reserved.

        </div>

      </div>

    </footer>
  );
}

export default Footer;