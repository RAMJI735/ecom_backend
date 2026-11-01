const express = require("express");
const router = express.Router();
const {
    getSettings,
    updateSettings,
    addHeroBanner,
    updateHeroBanner,
    deleteHeroBanner,
} = require("../controllers/settingsController");

router.route("/")
    .get(getSettings)
    .put(updateSettings);

router.route("/banners")
    .post(addHeroBanner);

router.route("/banners/:id")
    .put(updateHeroBanner)
    .delete(deleteHeroBanner);

module.exports = router;

