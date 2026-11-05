const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { CloudinaryUpload } = require("./cloudinary");

const tempUploadDir = path.join(os.tmpdir(), "electrical_uploads");
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  } catch (_) {}
}

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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware that parses FormData and uploads image if attached
const handleImageUpload = (fieldName = "image") => {
  const multerMiddleware = upload.fields([
    { name: fieldName, maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  return (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload parsing error",
        });
      }

      const file = req.files?.[fieldName]?.[0] || req.files?.file?.[0] || req.file;

      if (file) {
        try {
          const result = await CloudinaryUpload(file);
          const imageUrl = typeof result === "string" ? result : result.secure_url;
          const publicId = typeof result === "object" ? result.public_id : "";

          req.body.image = imageUrl;
          if (publicId) {
            req.body.public_id = publicId;
            req.body.imagePublicId = publicId;
          }
          if (!req.body.images && req.body.images !== "") {
            req.body.images = [imageUrl];
          }
        } catch (uploadErr) {
          console.error("Auto image upload failed:", uploadErr);
          if (file?.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (_) {}
          }
          return res.status(500).json({
            success: false,
            message: uploadErr.message || "Failed to process uploaded image",
          });
        }
      }

      next();
    });
  };
};

module.exports = {
  handleImageUpload,
};
