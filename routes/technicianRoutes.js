const express = require("express");
const router = express.Router();
const {
    createTechnician,
    getAllTechnicians,
    getAvailableTechnicians,
    getTechnicianById,
    updateTechnician,
    deleteTechnician,
} = require("../controllers/technicianController");

const publicCache = require("../utils/cacheMiddleware");

// Available technicians endpoint for quick dispatch dropdowns
router.get("/available", publicCache, getAvailableTechnicians);

// Technician collection CRUD routes
router.route("/")
    .get(publicCache, getAllTechnicians)
    .post(createTechnician);

// Single technician CRUD routes
router.route("/:id")
    .get(publicCache, getTechnicianById)
    .put(updateTechnician)
    .patch(updateTechnician)
    .delete(deleteTechnician);

module.exports = router;
