const express = require("express");
const router = express.Router();
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
} = require("../controllers/serviceController");

const publicCache = require("../utils/cacheMiddleware");

// Service Details CRUD routes
router.route("/")
    .post(createService)
    .get(publicCache, getAllServices);

router.route("/:id")
    .get(publicCache, getServiceById)
    .put(updateService)
    .patch(updateService)
    .delete(deleteService);

module.exports = router;
