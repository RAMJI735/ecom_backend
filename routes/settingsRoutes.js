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
const wrapAsync = require("../utils/wrapAsync");

// Publicly view store settings & banners wrapped with wrapAsync
router.get("/", wrapAsync(getSettings));

// Admin-only store settings & banner modifications wrapped with wrapAsync
router.put("/", protect, adminOnly, wrapAsync(updateSettings));

router.route("/banners")
    .post(protect, adminOnly, handleImageUpload("image"), wrapAsync(addHeroBanner));

router.route("/banners/:id")
    .put(protect, adminOnly, handleImageUpload("image"), wrapAsync(updateHeroBanner))
    .delete(protect, adminOnly, wrapAsync(deleteHeroBanner));

module.exports = router;
