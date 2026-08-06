import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaUser, FaEdit, FaSignOutAlt } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import apiClient, { getStoredUser } from "../config/apiClient";

function Profile() {
  const navigate = useNavigate();
  const savedUser = getStoredUser();

  const [user, setUser] = useState(savedUser);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(savedUser.name || "");
  const [username, setUsername] = useState(
    savedUser.username || savedUser.email?.split("@")[0] || ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || token === "truthlens_token" || token === "google_token") return;

    apiClient
      .get("/api/auth/profile")
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          setName(res.data.user.name || "");
          setUsername(res.data.user.username || res.data.user.email?.split("@")[0] || "");
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const updatedUser = {
      ...user,
      name: name.trim() || "User",
      username: username.trim() || "truthlens_user",
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (token && token !== "truthlens_token" && token !== "google_token") {
        const res = await apiClient.put("/api/auth/profile", {
          name: updatedUser.name,
          username: updatedUser.username,
          picture: updatedUser.picture,
        });
        if (res.data?.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setUser(res.data.user);
          setEditMode(false);
          alert("Profile updated successfully");
          return;
        }
      }

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditMode(false);
      alert("Profile updated successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <MainLayout>
      <div className="min-h-screen px-4 py-10 pb-28 flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white/10 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center">
            <img
              src={user.picture || "/logo.png"}
              alt="profile"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/logo.png";
              }}
              className="w-28 h-28 mx-auto rounded-full object-cover border-4 border-cyan-400 mb-5"
            />

            <h1 className="text-3xl font-bold text-white">{user.name || "User"}</h1>

            <p className="text-cyan-400 font-medium">
              @{user.username || user.email?.split("@")[0] || "truthlens_user"}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <FaUser /> Full Name
              </p>
              {editMode ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-2 p-3 rounded-xl bg-black/40 border border-gray-700 text-white outline-none focus:border-cyan-400"
                />
              ) : (
                <h2 className="text-white font-semibold mt-1">{user.name || "User"}</h2>
              )}
            </div>

            <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <FaUser /> Username
              </p>
              {editMode ? (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full mt-2 p-3 rounded-xl bg-black/40 border border-gray-700 text-white outline-none focus:border-cyan-400"
                />
              ) : (
                <h2 className="text-white font-semibold mt-1">
                  @{user.username || user.email?.split("@")[0] || "truthlens_user"}
                </h2>
              )}
            </div>

            <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <FaEnvelope /> Email Address
              </p>
              <h2 className="text-white font-semibold mt-1 break-words">
                {user.email || "No email available"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
                <p className="text-gray-400 text-sm">Account Type</p>
                <h2 className="text-white font-semibold mt-1">
                  {user.password === "google-login" || user.picture?.includes("googleusercontent")
                    ? "Google Account"
                    : "TruthLens User"}
                </h2>
              </div>

              <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
                <p className="text-gray-400 text-sm">Status</p>
                <h2 className="text-green-400 font-semibold mt-1">Active</h2>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {editMode ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center gap-2"
              >
                <FaEdit /> Edit Profile
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center gap-2"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default Profile;
