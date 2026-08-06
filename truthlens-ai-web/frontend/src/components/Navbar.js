import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  FaHome,
  FaUser,
  FaHistory,
  FaRobot,
} from "react-icons/fa";

function Navbar() {

  const navigate = useNavigate();
  const location = useLocation();

  // SAFE USER PARSE

  let user = {};

  try {

    user =
      JSON.parse(
        localStorage.getItem("user")
      ) || {};

  } catch {

    user = {};

  }

  // NAV ITEMS

const navItems = [

    {
      name: "Home",
      icon: <FaHome />,
      path: "/dashboard",
    },

    {
      name: "Profile",
      icon: <FaUser />,
      path: "/profile",
    },

    {
      name: "History",
      icon: <FaHistory />,
      path: "/history",
    },

    {
      name: "AI Chat",
      icon: <FaRobot />,
      path: "/chat",
    },
  ];

  return (
    <>

      {/* DESKTOP NAVBAR */}

      <div className="hidden md:flex items-center justify-between px-8 py-4 bg-[#020617]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">

        {/* LEFT */}

        <div
          onClick={() =>
            navigate("/dashboard")
          }
          className="flex items-center gap-4 cursor-pointer"
        >

          <img
            src="/logo.png"
            alt="logo"
            className="w-12 h-12 rounded-2xl object-cover"
          />

          <div>

            <h1 className="text-2xl font-bold text-white">
              TruthLens AI
            </h1>

            <p className="text-sm text-gray-400">
              AI Detection System
            </p>

          </div>

        </div>

        {/* CENTER */}

        <div className="flex items-center gap-4">

          {navItems.map(
            (item, index) => {

              const active =
                location.pathname ===
                item.path;

              return (

                <button
                  key={index}
                  onClick={() =>
                    navigate(item.path)
                  }
                  className={`px-5 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 font-medium

                  ${
                    active

                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"

                      : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }
                `}
                >

                  {item.icon}

                  <span>
                    {item.name}
                  </span>

                </button>

              );
            }
          )}
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-4">

          <img
            src={
              user.picture ||
              "/logo.png"
            }
            alt="profile"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src =
                "/logo.png";
            }}
            className="w-12 h-12 rounded-full border-2 border-cyan-400 object-cover"
          />

          <div>

            <h2 className="text-white font-semibold">
              {user.name || "User"}
            </h2>

            <p className="text-sm text-gray-400">
              {user.email ||
                "No Email"}
            </p>

          </div>

        </div>

      </div>

      {/* MOBILE NAVBAR */}

      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-50 px-2 py-2">

        <div className="flex items-center justify-between">

          {navItems.map(
            (item, index) => {

              const active =
                location.pathname ===
                item.path;

              return (

                <button
                  key={index}
                  onClick={() =>
                    navigate(item.path)
                  }
                  className={`flex flex-col items-center justify-center flex-1 py-2 rounded-2xl transition-all duration-300

                  ${
                    active

                      ? "bg-cyan-500/20 text-cyan-400"

                      : "text-gray-400 hover:text-white"
                  }
                `}
                >

                  <div className="text-lg mb-1">
                    {item.icon}
                  </div>

                  <span className="text-[10px] font-medium">
                    {item.name}
                  </span>

                </button>

              );
            }
          )}
        </div>

      </div>

      {/* MOBILE SPACE */}

      <div className="h-24 md:hidden"></div>

    </>
  );
}

export default Navbar;