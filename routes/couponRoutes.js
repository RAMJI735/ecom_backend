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
const wrapAsync = require("../utils/wrapAsync");

// Validate coupon during checkout wrapped with wrapAsync
router.post("/validate", optionalAuth, wrapAsync(validateCoupon));

// View coupons (public / customers) wrapped with wrapAsync
router.get("/", wrapAsync(getCoupons));

// Admin-only coupon lifecycle CRUD wrapped with wrapAsync
router.post("/", protect, adminOnly, wrapAsync(createCoupon));

router.route("/:id")
    .put(protect, adminOnly, wrapAsync(updateCoupon))
    .delete(protect, adminOnly, wrapAsync(deleteCoupon));

module.exports = router;
