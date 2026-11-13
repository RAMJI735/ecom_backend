const express = require("express");
const router = express.Router();
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
} = require("../controllers/serviceController");

const { handleImageUpload } = require("../utils/uploadMiddleware");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const publicCache = require("../utils/cacheMiddleware");
const wrapAsync = require("../utils/wrapAsync");

// Public browsing & Admin service creation wrapped with wrapAsync
router.route("/")
    .get(publicCache, wrapAsync(getAllServices))
    .post(protect, adminOnly, handleImageUpload("image"), wrapAsync(createService));

// Single service details (public) & Admin updates/deletion wrapped with wrapAsync
router.route("/:id")
    .get(publicCache, wrapAsync(getServiceById))
    .put(protect, adminOnly, handleImageUpload("image"), wrapAsync(updateService))
    .patch(protect, adminOnly, handleImageUpload("image"), wrapAsync(updateService))
    .delete(protect, adminOnly, wrapAsync(deleteService));

module.exports = router;
