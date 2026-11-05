const express = require("express");
const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { CloudinaryUpload, CloudinaryDelete } = require("../utils/cloudinary");

const router = express.Router();

// Ensure temporary upload directory exists
const tempUploadDir = path.join(os.tmpdir(), "electrical_uploads");
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  } catch (_) {}
}

// Multer disk storage writes files to disk so file.path is available for fs.createReadStream
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Configure multer with disk storage (max 10MB)
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// POST /api/upload - Accepts FormData with 'image' or 'file'
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    const file = req.files?.image?.[0] || req.files?.file?.[0] || req.file;

    try {
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided in FormData. Please attach a file with key 'image' or 'file'.",
        });
      }

      const uploadResult = await CloudinaryUpload(file);
      const imageUrl = uploadResult.secure_url || uploadResult;
      const publicId = uploadResult.public_id || "";

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        url: imageUrl,
        public_id: publicId,
        data: {
          url: imageUrl,
          public_id: publicId,
          name: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      });
    } catch (error) {
      console.error("Image upload error:", error);
      // Clean up file if still present
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (_) {}
      }
      return res.status(500).json({
        success: false,
        message: error.response?.data?.error?.message || error.message || "Failed to upload image",
      });
    }
  }
);

// DELETE /api/upload - Delete image by public_id or url
router.delete("/", async (req, res) => {
  try {
    const target = req.body?.public_id || req.body?.url || req.query?.public_id || req.query?.url;
    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Please provide 'public_id' or 'url' to delete.",
      });
    }

    const result = await CloudinaryDelete(target);
    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Image delete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete image",
    });
  }
});

module.exports = router;
