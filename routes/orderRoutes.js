const express = require("express");
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Custom middleware for createOrder: enforces authentication, with support for guestId checkout
const orderAuthOrGuest = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cookie = req.headers.cookie;
    if (
        (authHeader && authHeader.startsWith("Bearer ")) ||
        (cookie && cookie.includes("token=")) ||
        req.headers["x-auth-token"]
    ) {
        return protect(req, res, next);
    }
    if (req.body?.guestId) {
        return next();
    }
    return protect(req, res, next);
};

// Order root routes
// GET /api/orders: Get all orders (admin or filtered by current user)
// POST /api/orders: Place new order
router.route("/")
    .get(protect, getOrders)
    .post(orderAuthOrGuest, createOrder);

// User-specific orders list
router.get("/user/:userId", protect, getOrders);

// Single order details
router.get("/:id", protect, getOrderById);

// Customer / Admin order cancellation
router.put("/:id/cancel", protect, cancelOrder);
router.patch("/:id/cancel", protect, cancelOrder);

// Admin-only order status transition (Confirmed -> Processing -> Delivered, etc.)
router.patch("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
