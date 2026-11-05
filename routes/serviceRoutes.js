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
const publicCache = require("../utils/cacheMiddleware");

// Service Details CRUD routes
router.route("/")
    .post(handleImageUpload("image"), createService)
    .get(publicCache, getAllServices);

router.route("/:id")
    .get(publicCache, getServiceById)
    .put(handleImageUpload("image"), updateService)
    .patch(handleImageUpload("image"), updateService)
    .delete(deleteService);

module.exports = router;
