const express = require("express");
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
} = require("../controllers/orderController");

router.route("/")
    .get(getOrders)
    .post(createOrder);

router.get("/user/:userId", getOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
