import React from "react";
import Navbar from "../components/Navbar";

function MainLayout({
  children,
  showNavbar = true,
  showFooter = true,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#020617] to-[#071330] text-white overflow-x-hidden">
      {showNavbar && <Navbar />}

      <main className="min-h-screen pb-24 md:pb-0">
        {children}
      </main>

      {showFooter && (
        <footer className="border-t border-white/10 bg-black/30 backdrop-blur-xl px-4 py-6 text-center text-gray-400">
          <h2 className="text-white font-bold text-lg mb-1">
            TruthLens AI v1.0
          </h2>

          <p className="text-sm">
            AI-Powered Fake News, Deepfake & URL Detection System
          </p>

          <p className="text-xs mt-2">
            Developed by M. Ayesha • © 2026
          </p>
        </footer>
      )}
    </div>
  );
}

export default MainLayout;