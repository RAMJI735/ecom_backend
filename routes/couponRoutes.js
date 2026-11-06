const express = require("express");
const router = express.Router();
const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} = require("../controllers/couponController");
const { protect, adminOnly, optionalAuth } = require("../middleware/authMiddleware");

// Validate coupon during checkout
router.post("/validate", optionalAuth, validateCoupon);

// View coupons (public / customers)
router.get("/", getCoupons);

// Admin-only coupon lifecycle CRUD
router.post("/", protect, adminOnly, createCoupon);

router.route("/:id")
    .put(protect, adminOnly, updateCoupon)
    .delete(protect, adminOnly, deleteCoupon);

module.exports = router;
