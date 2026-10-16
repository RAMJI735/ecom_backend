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

// Available technicians endpoint for quick dispatch dropdowns
router.get("/available", getAvailableTechnicians);

// Technician collection CRUD routes
router.route("/")
    .get(getAllTechnicians)
    .post(createTechnician);

// Single technician CRUD routes
router.route("/:id")
    .get(getTechnicianById)
    .put(updateTechnician)
    .patch(updateTechnician)
    .delete(deleteTechnician);

module.exports = router;
