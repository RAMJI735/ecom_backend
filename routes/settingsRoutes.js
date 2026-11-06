const express = require("express");
const router = express.Router();
const {
    getSettings,
    updateSettings,
    addHeroBanner,
    updateHeroBanner,
    deleteHeroBanner,
} = require("../controllers/settingsController");
const { handleImageUpload } = require("../utils/uploadMiddleware");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Publicly view store settings & banners
router.get("/", getSettings);

// Admin-only store settings & banner modifications
router.put("/", protect, adminOnly, updateSettings);

router.route("/banners")
    .post(protect, adminOnly, handleImageUpload("image"), addHeroBanner);

router.route("/banners/:id")
    .put(protect, adminOnly, handleImageUpload("image"), updateHeroBanner)
    .delete(protect, adminOnly, deleteHeroBanner);

module.exports = router;
