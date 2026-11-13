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
const wrapAsync = require("../utils/wrapAsync");

// Technicians endpoints (requires authentication)
router.use(protect);

// Available technicians endpoint for quick dispatch dropdowns wrapped with wrapAsync
router.get("/available", wrapAsync(getAvailableTechnicians));

// Technician collection CRUD routes wrapped with wrapAsync
router.route("/")
    .get(wrapAsync(getAllTechnicians))
    .post(adminOnly, wrapAsync(createTechnician));

// Single technician CRUD routes wrapped with wrapAsync
router.route("/:id")
    .get(wrapAsync(getTechnicianById))
    .put(adminOnly, wrapAsync(updateTechnician))
    .patch(adminOnly, wrapAsync(updateTechnician))
    .delete(adminOnly, wrapAsync(deleteTechnician));

module.exports = router;
