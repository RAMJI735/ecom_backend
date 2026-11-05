const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");

/**
 * Extracts Cloudinary public_id from a URL or raw public_id string.
 * @param {string} urlOrId
 * @returns {string|null}
 */
const extractPublicId = (urlOrId) => {
  if (!urlOrId || typeof urlOrId !== "string") return null;

  // If already a public_id (not a web URL)
  if (!urlOrId.startsWith("http://") && !urlOrId.startsWith("https://")) {
    return urlOrId.trim();
  }

  // Must be a Cloudinary URL
  if (!urlOrId.includes("cloudinary.com")) {
    return null;
  }

  try {
    const uploadIndex = urlOrId.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    let afterUpload = urlOrId.substring(uploadIndex + 8);

    // If first segment is transformation parameters (e.g. c_scale,w_500), strip it
    const segments = afterUpload.split("/");
    if (segments.length > 1 && !segments[0].match(/^v\d+$/) && segments[0].includes("_")) {
      segments.shift();
    }
    afterUpload = segments.join("/");

    // Remove version prefix (e.g. v1793890299/)
    afterUpload = afterUpload.replace(/^v\d+\//, "");

    // Strip file extension
    const dotIndex = afterUpload.lastIndexOf(".");
    if (dotIndex !== -1) {
      afterUpload = afterUpload.substring(0, dotIndex);
    }

    return afterUpload || null;
  } catch (error) {
    console.error("Error extracting Cloudinary public_id:", error.message);
    return null;
  }
};

/**
 * Uploads an image file to Cloudinary using FormData and upload_preset.
 * @param {Object|string|Buffer} file - Express/Multer file object, file path, or buffer
 * @returns {Promise<{ secure_url: string, url: string, public_id: string }>}
 */
const CloudinaryUpload = async (file) => {
  if (!file) {
    throw new Error("No file provided to CloudinaryUpload");
  }

  const cloudName = process.env.CLOUD_NAME || process.env.cloud_name || "dv2rmuhxl";
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.upload_preset || "Electrical";
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinary_key || "397355892565452";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_secret || "fmj5QX2EzJbhgwSFJVsLtsu_TC4";

  // Resolve temporary file path
  let filePath = "";
  let isTempCreated = false;

  if (typeof file === "string") {
    filePath = file;
  } else if (file && file.path) {
    filePath = file.path;
  } else if (file && (file.buffer || Buffer.isBuffer(file))) {
    const buffer = file.buffer || file;
    const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.tmp`;
    filePath = path.join(os.tmpdir(), tempFileName);
    fs.writeFileSync(filePath, buffer);
    isTempCreated = true;
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Invalid or non-existent file path provided for upload");
  }

  const buildFormData = (isSigned = false) => {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("upload_preset", uploadPreset);

    // If preset is configured as signed in Cloudinary, include signed timestamp & signature
    if (isSigned && apiKey && apiSecret) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signatureStr = `timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
    }

    return formData;
  };

  let response;

  try {
    // 1. Try standard upload with preset
    const formData = buildFormData(false);
    response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: formData.getHeaders ? formData.getHeaders() : {},
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
      }
    );
  } catch (error) {
    // 2. If preset is signed and requires signature, retry with signed parameters
    const errorMsg = error?.response?.data?.error?.message || error.message || "";
    if (errorMsg.includes("unsigned") || errorMsg.includes("whitelisted")) {
      const signedFormData = buildFormData(true);
      response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        signedFormData,
        {
          headers: signedFormData.getHeaders ? signedFormData.getHeaders() : {},
          maxContentLength: 50 * 1024 * 1024,
          maxBodyLength: 50 * 1024 * 1024,
        }
      );
    } else {
      throw error;
    }
  } finally {
    // Clean up temporary file from disk
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn("Could not delete temporary file:", unlinkErr.message);
      }
    }
  }

  const result = {
    secure_url: response.data.secure_url,
    url: response.data.secure_url,
    public_id: response.data.public_id,
  };

  // Provide string coercion so String(result) or string templates return secure_url
  result[Symbol.toPrimitive] = () => response.data.secure_url;
  result.toString = () => response.data.secure_url;
  result.valueOf = () => response.data.secure_url;

  return result;
};

/**
 * Deletes an image from Cloudinary using public_id or image URL.
 * @param {string} publicIdOrUrl - The public_id or full Cloudinary URL of the image
 * @returns {Promise<Object|null>}
 */
const CloudinaryDelete = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return null;

  const publicId = extractPublicId(publicIdOrUrl);
  if (!publicId) return null;

  const cloudName = process.env.CLOUD_NAME || process.env.cloud_name || "dv2rmuhxl";
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinary_key || "397355892565452";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_secret || "fmj5QX2EzJbhgwSFJVsLtsu_TC4";

  if (!apiSecret || !apiKey) {
    console.warn("Cloudinary API credentials missing. Cannot delete image:", publicId);
    return null;
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      formData,
      {
        headers: formData.getHeaders ? formData.getHeaders() : {},
      }
    );
    console.log(`Cloudinary image deleted successfully (${publicId}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to delete image ${publicId} from Cloudinary:`,
      error?.response?.data || error.message
    );
    return null;
  }
};

module.exports = {
  CloudinaryUpload,
  CloudinaryDelete,
  extractPublicId,
};
