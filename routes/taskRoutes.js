const express = require("express");
const router = express.Router();
const {
    createTask,
    getAllTasks,
    getTaskById,
    assignTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
} = require("../controllers/taskAssignmentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All task operations require authentication
router.use(protect);

// Task collection CRUD routes
router.route("/")
    .get(getAllTasks)
    .post(createTask);

// Assign or Reassign Technician to Task (Admin only)
router.route("/:id/assign")
    .patch(adminOnly, assignTask)
    .post(adminOnly, assignTask);

// Update Task Lifecycle Status
router.route("/:id/status")
    .patch(updateTaskStatus)
    .put(updateTaskStatus);

// Single task details, update, delete
router.route("/:id")
    .get(getTaskById)
    .put(updateTask)
    .patch(updateTask)
    .delete(adminOnly, deleteTask);

module.exports = router;
