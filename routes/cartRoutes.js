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

// Cart root endpoints: Get cart, Add item to cart, Clear cart
router.route("/")
    .get(getCart)
    .post(addToCart)
    .delete(clearCart);

// Explicit action endpoints
router.post("/add", addToCart);
router.delete("/clear", clearCart);

// User-specific cart endpoint: /api/cart/user/:userId
router.route("/user/:userId")
    .get(getCart)
    .delete(clearCart);

// Item-level operations: update quantity, remove item
router.route("/items/:itemId")
    .put(updateCartItem)
    .patch(updateCartItem)
    .delete(removeCartItem);

// Alternative explicit remove route: /api/cart/remove/:itemId
router.delete("/remove/:itemId", removeCartItem);

// Coupon endpoints
router.post("/apply-coupon", applyCoupon);
router.post("/remove-coupon", removeCoupon);

// Merge guest cart on login
router.post("/merge", mergeGuestCart);

module.exports = router;
