/**
 * TruthLens AI – Authentication Routes
 * Business logic lives in controllers/services.
 */

const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { authLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/google-login", authLimiter, authController.googleLogin);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password/:token", authLimiter, authController.resetPassword);
router.post("/firebase-sync", requireAuth, authController.firebaseSync);
router.get("/profile", requireAuth, authController.getProfile);
router.put("/profile", requireAuth, authController.updateProfile);

module.exports = router;
