const express = require("express");
const router = express.Router();
const {
    register,
    login,
    getMe,
    logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Authentication endpoints
router.post("/register", register);
router.post("/signup", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", logout);

module.exports = router;

