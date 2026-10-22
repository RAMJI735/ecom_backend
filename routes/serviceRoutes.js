const express = require("express");
const router = express.Router();
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
} = require("../controllers/serviceController");

const { cacheControl } = require("../utils/cacheMiddleware");

// Service Details CRUD routes
router.route("/")
    .post(createService)
    .get(cacheControl("public, s-maxage=60, stale-while-revalidate=300"), getAllServices);

router.route("/:id")
    .get(cacheControl("public, s-maxage=60, stale-while-revalidate=300"), getServiceById)
    .put(updateService)
    .patch(updateService)
    .delete(deleteService);

module.exports = router;
