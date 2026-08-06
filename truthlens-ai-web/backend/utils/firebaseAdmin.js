const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

if (!admin.getApps().length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "truthlens-ai",
  });
}

// Attach auth helper
admin.auth = () => getAuth();

module.exports = admin;