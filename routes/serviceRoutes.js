const express = require("express");
const router = express.Router();
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
} = require("../controllers/serviceController");

// Service Details CRUD routes
router.route("/")
    .post(createService)
    .get(getAllServices);

router.route("/:id")
    .get(getServiceById)
    .put(updateService)
    .patch(updateService)
    .delete(deleteService);

module.exports = router;
