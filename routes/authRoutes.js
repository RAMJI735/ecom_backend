const express = require("express");
const router = express.Router();
const {
    register,
    login,
    getMe,
    logout,
    sendEmailOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const wrapAsync = require("../utils/wrapAsync");

// Authentication endpoints wrapped with wrapAsync
router.post("/register", wrapAsync(register));
router.post("/signup", wrapAsync(register));
router.post("/login", wrapAsync(login));
router.get("/me", protect, wrapAsync(getMe));
router.post("/logout", wrapAsync(logout));
router.post("/send-otp", wrapAsync(sendEmailOtp));

module.exports = router;
