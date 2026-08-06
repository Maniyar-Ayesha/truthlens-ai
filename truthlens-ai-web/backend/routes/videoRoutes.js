/**
 * TruthLens AI – Video Routes (Upgraded)
 * GET  /api/check-video  (health check)
 * POST /api/check-video  (multipart/form-data, field: "video")
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { checkVideo } = require("../controllers/videoController");
const { aiLimiter } = require("../middlewares/rateLimiter");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|avi|mov|mkv|webm|flv|wmv/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase().replace(".", ""));
    if (extOk) return cb(null, true);
    cb(new Error("Only video files are allowed (MP4, AVI, MOV, MKV, WebM, FLV)"));
  },
});

router.get("/check-video", (req, res) => {
  res.json({ success: true, message: "Video analysis route is running." });
});

router.post(
  "/check-video",
  (req, res, next) => {
    console.log("VIDEO STEP 1 Route reached");
    next();
  },
  aiLimiter,
  (req, res, next) => {
    upload.single("video")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Video is too large. Maximum 50 MB allowed." });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  checkVideo
);

module.exports = router;