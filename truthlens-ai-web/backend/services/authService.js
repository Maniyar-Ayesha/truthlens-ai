/**
 * TruthLens AI – Authentication Service
 * Handles signup, login, Google OAuth, password reset, and JWT issuance.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { Resend } = require("resend");
const User = require("../models/User");
const logger = require("../utils/logger");

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "truthlens_ai_super_secure_secret_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (password.length > 128) {
    return "Password is too long";
  }
  return null;
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

async function signup({ name, email, password }) {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    const err = new Error("All fields are required");
    err.statusCode = 400;
    throw err;
  }

  const emailError = validateEmail(cleanEmail);
  if (emailError) {
    const err = new Error(emailError);
    err.statusCode = 400;
    throw err;
  }

  const passwordError = validatePassword(cleanPassword);
  if (passwordError) {
    const err = new Error(passwordError);
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const err = new Error("User already exists");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,
    picture: "/logo.png",
    username: cleanEmail.split("@")[0],
  });

  const token = generateToken(user);
  return { message: "Signup successful", token, user: sanitizeUser(user) };
}

async function login({ email, password }) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    const err = new Error("Email and password required");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 400;
    throw err;
  }

  // Google-only accounts (placeholder password) cannot use email/password
  // until they set a password via forgot-password / reset.
  if (!user.password || user.password === "google-login") {
    const err = new Error("This account uses Google sign-in. Use Google login, or set a password via Forgot Password.");
    err.statusCode = 400;
    throw err;
  }

  const validPassword = await bcrypt.compare(cleanPassword, user.password);
  if (!validPassword) {
    const err = new Error("Invalid email or password");
    err.statusCode = 400;
    throw err;
  }

  const token = generateToken(user);
  return { message: "Login successful", token, user: sanitizeUser(user) };
}

async function googleLogin(idToken) {
  if (!idToken) {
    const err = new Error("Google token missing");
    err.statusCode = 400;
    throw err;
  }

  // Accept Web + Android (+ optional iOS) client IDs from Firebase / Google Cloud
  const audiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);

  if (!audiences.length) {
    const err = new Error("Google OAuth is not configured");
    err.statusCode = 503;
    throw err;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences.length === 1 ? audiences[0] : audiences,
  });

  const payload = ticket.getPayload();
  const email = payload.email?.toLowerCase();
  const name = payload.name;
  const picture = payload.picture;

  if (!email) {
    const err = new Error("Google account email is required");
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      picture,
      password: "google-login",
      username: email.split("@")[0],
    });
  } else {
    user.name = name || user.name;
    user.picture = picture || user.picture;
    if (!user.username) user.username = email.split("@")[0];
    await user.save();
  }

  const token = generateToken(user);
  return { message: "Google login successful", token, user: sanitizeUser(user) };
}

async function forgotPassword(email) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    const err = new Error("Email not found");
    err.statusCode = 404;
    throw err;
  }

  // Allow Google accounts to set a local password via reset link
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

  if (!process.env.RESEND_API_KEY) {
    logger.warn("AuthService", "RESEND_API_KEY missing; reset token generated but email not sent");
    return {
      message: "Password reset link generated. Email service is not configured.",
      ...(process.env.NODE_ENV !== "production" ? { resetLink } : {}),
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "TruthLens AI <onboarding@resend.dev>",
    to: user.email,
    subject: "TruthLens AI Password Reset",
    html: `
      <h2>TruthLens AI Password Reset</h2>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password.</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });

  return { message: "Password reset link sent to your email" };
}

async function resetPassword(token, password) {
  const cleanPassword = (password || "").trim();
  const passwordError = validatePassword(cleanPassword);
  if (passwordError) {
    const err = new Error(passwordError);
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired reset link");
    err.statusCode = 400;
    throw err;
  }

  user.password = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return { message: "Password reset successful" };
}

async function updateProfile(userId, { name, username, picture }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (typeof name === "string" && name.trim()) {
    user.name = name.trim().slice(0, 100);
  }
  if (typeof username === "string" && username.trim()) {
    user.username = username.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40);
  }
  if (typeof picture === "string" && picture.trim()) {
    user.picture = picture.trim().slice(0, 2048);
  }

  await user.save();
  return { message: "Profile updated successfully", user: sanitizeUser(user) };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return { user: sanitizeUser(user) };
}

async function firebaseSync(firebaseUser) {
  const { email, name, picture } = firebaseUser;
  if (!email) {
    const err = new Error("Firebase account email is required");
    err.statusCode = 400;
    throw err;
  }

  const cleanEmail = email.toLowerCase();
  let user = await User.findOne({ email: cleanEmail });

  if (!user) {
    user = await User.create({
      name: name || cleanEmail.split("@")[0],
      email: cleanEmail,
      picture: picture || "/logo.png",
      password: "firebase-login", // Placeholder for external accounts
      username: cleanEmail.split("@")[0],
    });
  } else {
    // Optional: update details if they are missing
    let updated = false;
    if (name && !user.name) {
      user.name = name;
      updated = true;
    }
    if (picture && user.picture === "/logo.png") {
      user.picture = picture;
      updated = true;
    }
    if (updated) {
      await user.save();
    }
  }

  const token = generateToken(user);
  return { message: "Firebase sync successful", token, user: sanitizeUser(user) };
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
  generateToken,
  sanitizeUser,
};
