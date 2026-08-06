require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const newsRoutes = require("./routes/newsRoutes");
const imageRoutes = require("./routes/imageRoutes");
const videoRoutes = require("./routes/videoRoutes");
const urlRoutes = require("./routes/urlRoutes");
const historyRoutes = require("./routes/historyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const taskQueueRoutes = require("./routes/taskQueueRoutes");
const modelRoutes = require("./routes/modelRoutes");
const reportRoutes = require("./routes/reportRoutes");

const { generalLimiter } = require("./middlewares/rateLimiter");
const { sanitizeInputs } = require("./middlewares/validateInput");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

const app = express();

/* ENSURE DIRECTORIES EXIST */
const UPLOADS_DIR = path.join(__dirname, "uploads");
const REPORTS_DIR = path.join(__dirname, "reports");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

/* SECURITY HEADERS */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

/* PERFORMANCE */
app.use(compression());

/* CORS */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser tools (no Origin) and known local frontends
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

/* RATE LIMITER */
app.use(generalLimiter);

/* BODY LIMIT */
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

/* INPUT SANITIZATION */
app.use(sanitizeInputs);
app.use((req, res, next) => {
  try {
    mongoSanitize.sanitize(req.body);
    mongoSanitize.sanitize(req.params);
    if (req.query && typeof req.query === "object") {
      mongoSanitize.sanitize(req.query);
    }
  } catch (err) {
    logger.warn("Server", `Mongo sanitize skipped: ${err.message}`);
  }
  next();
});

/* REQUEST LOGGING */
app.use((req, res, next) => {
  if (req.path !== "/" && req.path !== "/cors-test") {
    logger.info("Server", `${req.method} ${req.path}`);
  }
  next();
});

/* DATABASE */
async function connectMongo(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info("Server", "MongoDB connected");
      return;
    } catch (error) {
      logger.error("Server", `MongoDB connect attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  logger.error("Server", "Auth/History/Dashboard require MongoDB. Start MongoDB and restart the server.");
}

connectMongo();

mongoose.connection.on("disconnected", () => {
  logger.warn("Server", "MongoDB disconnected — will try to reconnect");
});

mongoose.connection.on("reconnected", () => {
  logger.info("Server", "MongoDB reconnected");
});

/* TEST */
app.get("/", (req, res) => {
  res.send("TruthLens AI backend is running");
});

app.get("/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS working",
  });
});

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api", newsRoutes);
app.use("/api", imageRoutes);
app.use("/api", videoRoutes);
app.use("/api", urlRoutes);
app.use("/api", historyRoutes);
app.use("/api", chatRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/tasks", taskQueueRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/reports", reportRoutes);

/* 404 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* GLOBAL ERROR HANDLER */
app.use(errorHandler);

/* START */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info("Server", `TruthLens AI backend running on port ${PORT}`);
  logger.info("Server", `Environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Server", "Unhandled promise rejection:", reason?.message || reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Server", "Uncaught exception:", error.message);
});