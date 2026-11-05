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

router.route("/")
    .get(getSettings)
    .put(updateSettings);

router.route("/banners")
    .post(handleImageUpload("image"), addHeroBanner);

router.route("/banners/:id")
    .put(handleImageUpload("image"), updateHeroBanner)
    .delete(deleteHeroBanner);

module.exports = router;

