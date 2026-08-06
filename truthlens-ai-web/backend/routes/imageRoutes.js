/**
 * TruthLens AI – Image Routes (Upgraded)
 * POST /api/check-image  (multipart/form-data, field: "image")
 * POST /api/reverse-search (multipart/form-data, field: "image")
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { checkImage, reverseSearchImage } = require("../controllers/imageController");
const { aiLimiter } = require("../middlewares/rateLimiter");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|webp|tiff/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP, BMP, TIFF)"));
  },
});

router.post(
  "/check-image",
  aiLimiter,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image is too large. Maximum 10 MB allowed." });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  checkImage
);

router.post(
  "/reverse-search",
  aiLimiter,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image is too large. Maximum 10 MB allowed." });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  reverseSearchImage
);

module.exports = router;