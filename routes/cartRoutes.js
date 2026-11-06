const express = require("express");
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    mergeGuestCart,
} = require("../controllers/cartController");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

// Cart root endpoints
// GET: Uses optionalAuth so logged-in users get their persistent cart, while unauthenticated users get empty cart structure safely
// POST & DELETE: Require authentication
router.route("/")
    .get(optionalAuth, getCart)
    .post(protect, addToCart)
    .delete(protect, clearCart);

// Explicit action endpoints
router.post("/add", protect, addToCart);
router.delete("/clear", protect, clearCart);

// User-specific cart endpoint: /api/cart/user/:userId
router.route("/user/:userId")
    .get(protect, getCart)
    .delete(protect, clearCart);

// Item-level operations: update quantity, remove item
router.route("/items/:itemId")
    .put(protect, updateCartItem)
    .patch(protect, updateCartItem)
    .delete(protect, removeCartItem);

// Alternative explicit remove route: /api/cart/remove/:itemId
router.delete("/remove/:itemId", protect, removeCartItem);

// Coupon endpoints
router.post("/apply-coupon", protect, applyCoupon);
router.post("/remove-coupon", protect, removeCoupon);

// Merge guest cart on login
router.post("/merge", protect, mergeGuestCart);

module.exports = router;
