/**
 * TruthLens AI – Authentication Controller
 */

const authService = require("../services/authService");
const logger = require("../utils/logger");

async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Signup failed: ${error.message}`);
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Login failed: ${error.message}`);
    next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const result = await authService.googleLogin(req.body.token);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Google login failed: ${error.message}`);
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Forgot password failed: ${error.message}`);
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.params.token, req.body.password);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Reset password failed: ${error.message}`);
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.legacy) {
      return res.status(401).json({
        success: false,
        message: "Please log in again to update your profile",
      });
    }
    const result = await authService.updateProfile(userId, req.body);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Update profile failed: ${error.message}`);
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.legacy) {
      return res.status(401).json({
        success: false,
        message: "Please log in again to view your profile",
      });
    }
    const result = await authService.getProfile(userId);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Get profile failed: ${error.message}`);
    next(error);
  }
}

async function firebaseSync(req, res, next) {
  try {
    const result = await authService.firebaseSync(req.user);
    res.json(result);
  } catch (error) {
    logger.error("AuthController", `Firebase sync failed: ${error.message}`);
    next(error);
  }
}

module.exports = {
  signup,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateProfile,
  getProfile,
  firebaseSync,
};
