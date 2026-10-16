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

// Task collection CRUD routes
router.route("/")
    .get(getAllTasks)
    .post(createTask);

// Assign or Reassign Technician to Task
router.route("/:id/assign")
    .patch(assignTask)
    .post(assignTask);

// Update Task Lifecycle Status
router.route("/:id/status")
    .patch(updateTaskStatus)
    .put(updateTaskStatus);

// Single task details, update, delete
router.route("/:id")
    .get(getTaskById)
    .put(updateTask)
    .patch(updateTask)
    .delete(deleteTask);

module.exports = router;
