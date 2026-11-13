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
const wrapAsync = require("../utils/wrapAsync");

// All task operations require authentication
router.use(protect);

// Task collection CRUD routes wrapped with wrapAsync
router.route("/")
    .get(wrapAsync(getAllTasks))
    .post(wrapAsync(createTask));

// Assign or Reassign Technician to Task (Admin only)
router.route("/:id/assign")
    .patch(adminOnly, wrapAsync(assignTask))
    .post(adminOnly, wrapAsync(assignTask));

// Update Task Lifecycle Status
router.route("/:id/status")
    .patch(wrapAsync(updateTaskStatus))
    .put(wrapAsync(updateTaskStatus));

// Single task details, update, delete
router.route("/:id")
    .get(wrapAsync(getTaskById))
    .put(wrapAsync(updateTask))
    .patch(wrapAsync(updateTask))
    .delete(adminOnly, wrapAsync(deleteTask));

module.exports = router;
