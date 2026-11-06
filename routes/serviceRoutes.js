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

// Public browsing & Admin service creation
router.route("/")
    .get(publicCache, getAllServices)
    .post(protect, adminOnly, handleImageUpload("image"), createService);

// Single service details (public) & Admin updates/deletion
router.route("/:id")
    .get(publicCache, getServiceById)
    .put(protect, adminOnly, handleImageUpload("image"), updateService)
    .patch(protect, adminOnly, handleImageUpload("image"), updateService)
    .delete(protect, adminOnly, deleteService);

module.exports = router;
