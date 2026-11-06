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

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Technicians endpoints (requires authentication)
router.use(protect);

// Available technicians endpoint for quick dispatch dropdowns
router.get("/available", getAvailableTechnicians);

// Technician collection CRUD routes
router.route("/")
    .get(getAllTechnicians)
    .post(adminOnly, createTechnician);

// Single technician CRUD routes
router.route("/:id")
    .get(getTechnicianById)
    .put(adminOnly, updateTechnician)
    .patch(adminOnly, updateTechnician)
    .delete(adminOnly, deleteTechnician);

module.exports = router;
