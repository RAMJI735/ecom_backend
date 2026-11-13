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
const wrapAsync = require("../utils/wrapAsync");

// Cart root endpoints wrapped with wrapAsync
// GET, POST, DELETE: Require authentication via protect middleware
router.route("/")
    .get(protect, wrapAsync(getCart))
    .post(protect, wrapAsync(addToCart))
    .delete(protect, wrapAsync(clearCart));

// Explicit action endpoints
router.post("/add", protect, wrapAsync(addToCart));
router.delete("/clear", protect, wrapAsync(clearCart));

// User-specific cart endpoint: /api/cart/user/:userId
router.route("/user/:userId")
    .get(protect, wrapAsync(getCart))
    .delete(protect, wrapAsync(clearCart));

// Item-level operations: update quantity, remove item
router.route("/items/:itemId")
    .put(protect, wrapAsync(updateCartItem))
    .patch(protect, wrapAsync(updateCartItem))
    .delete(protect, wrapAsync(removeCartItem));

// Alternative explicit remove route: /api/cart/remove/:itemId
router.delete("/remove/:itemId", protect, wrapAsync(removeCartItem));

// Coupon endpoints
router.post("/apply-coupon", protect, wrapAsync(applyCoupon));
router.post("/remove-coupon", protect, wrapAsync(removeCoupon));

// Merge guest cart on login
router.post("/merge", protect, wrapAsync(mergeGuestCart));

module.exports = router;
