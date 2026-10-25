const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Order = require("../model/order/OrderModal");
const Cart = require("../model/cart/cartModal");
const Service = require("../model/Service/ServiceModal");

const resolveUser = (req) => {
    let userId = req.user?.id || req.user?._id || req.params?.userId || req.query?.userId || req.body?.userId || null;

    if (!userId) {
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers.cookie) {
            const match = req.headers.cookie.match(/token=([^;]+)/);
            if (match) {
                token = match[1];
            }
        }

        if (token) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || "electrical_ecom_secret_key_2026"
                );
                if (decoded && (decoded.id || decoded._id)) {
                    userId = decoded.id || decoded._id;
                }
            } catch (err) {
                // Token invalid
            }
        }
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        return userId.toString();
    }
    return null;
};

// Generate friendly order number like VOLT-20261015-8491
const generateOrderNumber = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    return "VOLT-" + dateStr + "-" + randomHex;
};

/**
 * POST /api/orders
 * Create new order from cart or directly from items payload
 */
exports.createOrder = async (req, res) => {
    try {
        const userId = resolveUser(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in to place an order.",
            });
        }
        const {
            items: rawItems,
            shippingAddress,
            paymentMethod = "COD",
            paymentStatus = "Pending",
            transactionId = "",
            deliveryNotes = "",
            couponCode = "",
            clearCartOnSuccess = true,
        } = req.body;

        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city) {
            return res.status(400).json({
                success: false,
                message: "Full delivery address (name, phone, street, city) is required",
            });
        }

        let orderItems = [];

        // If items are passed explicitly
        if (Array.isArray(rawItems) && rawItems.length > 0) {
            for (const itm of rawItems) {
                const itemId = itm.item || itm.itemId || itm.id || itm._id;
                const qty = Math.max(1, parseInt(itm.quantity, 10) || 1);
                const price = Number(itm.price) || 0;
                orderItems.push({
                    item: itemId,
                    name: itm.name || itm.serviceName || "Electrical Service / Item",
                    type: itm.type || "service",
                    price: price,
                    quantity: qty,
                    image: itm.image || "",
                    category: itm.category || "",
                    brand: itm.brand || "",
                    itemTotal: price * qty,
                    notes: itm.notes || "",
                });
            }
        } else {
            // Pull from active cart
            const filter = { status: { $in: ["active", "Pending"] }, user: userId };

            const cart = await Cart.findOne(filter);
            if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cart is empty. Please add items before checking out.",
                });
            }

            orderItems = cart.items.map((i) => ({
                item: i.item,
                name: i.name,
                type: i.type || "service",
                price: i.price,
                quantity: i.quantity,
                image: i.image,
                category: i.category,
                brand: i.brand || "",
                itemTotal: i.price * i.quantity,
                notes: i.notes || "",
            }));
        }

        if (orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order must contain at least one item",
            });
        }

        // Calculate summary
        const subtotal = orderItems.reduce((acc, curr) => acc + curr.itemTotal, 0);
        const discount = couponCode.toUpperCase() === "VOLT10" ? Math.round(subtotal * 0.1) : 0;
        const tax = Math.round((subtotal - discount) * 0.18); // 18% GST
        const shippingFee = subtotal > 2000 ? 0 : 150;
        const grandTotal = subtotal - discount + tax + shippingFee;

        let uniqueOrderNumber = generateOrderNumber();
        while (await Order.findOne({ orderNumber: uniqueOrderNumber })) {
            uniqueOrderNumber = generateOrderNumber();
        }

        const newOrder = new Order({
            orderNumber: uniqueOrderNumber,
            user: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
            items: orderItems,
            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                phone: shippingAddress.phone.trim(),
                email: shippingAddress.email ? shippingAddress.email.trim() : "",
                street: shippingAddress.street.trim(),
                landmark: shippingAddress.landmark ? shippingAddress.landmark.trim() : "",
                city: shippingAddress.city.trim(),
                state: shippingAddress.state ? shippingAddress.state.trim() : "West Bengal",
                postalCode: (shippingAddress.postalCode || shippingAddress.pincode || "").trim(),
                country: shippingAddress.country || "India",
                deliveryNotes: deliveryNotes || shippingAddress.deliveryNotes || "",
                coordinates: shippingAddress.coordinates || (shippingAddress.latitude !== undefined && shippingAddress.longitude !== undefined ? {
                    latitude: Number(shippingAddress.latitude),
                    longitude: Number(shippingAddress.longitude),
                    accuracy: shippingAddress.accuracy ? Number(shippingAddress.accuracy) : null,
                } : undefined),
                location: shippingAddress.location || (shippingAddress.latitude !== undefined && shippingAddress.longitude !== undefined ? {
                    type: "Point",
                    coordinates: [Number(shippingAddress.longitude), Number(shippingAddress.latitude)],
                    formattedAddress: `${shippingAddress.street}, ${shippingAddress.city}`,
                } : undefined),
            },
            payment: {
                method: paymentMethod.toUpperCase(),
                status: paymentStatus,
                transactionId: transactionId || "",
            },
            summary: {
                subtotal,
                discount,
                couponCode,
                shippingFee,
                tax,
                grandTotal,
            },
            orderStatus: "Confirmed",
            timeline: [
                {
                    status: "Confirmed",
                    time: new Date(),
                    note: "Order confirmed with " + (paymentMethod.toUpperCase() === "COD" ? "Cash on Delivery" : "Online Payment"),
                },
            ],
        });

        await newOrder.save();

        // Clear active cart on user account
        if (clearCartOnSuccess && userId) {
            try {
                const carts = await Cart.find({
                    user: userId,
                    status: { $in: ["active", "Pending"] },
                });

                for (const c of carts) {
                    c.items = [];
                    c.couponCode = "";
                    c.discount = 0;
                    c.calculateTotals();
                    await c.save();
                }
            } catch (clearErr) {
                console.error("Cart clear post-order error:", clearErr);
            }
        }

        const populatedOrder = await Order.findById(newOrder._id).populate({
            path: "items.item",
            select: "serviceName price category brand model image warranty estimated_time type",
        });

        return res.status(201).json({
            success: true,
            message: "Order placed successfully! Voltline reference number generated.",
            data: populatedOrder,
        });
    } catch (error) {
        console.error("Create order error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create order",
        });
    }
};

/**
 * GET /api/orders
 * Get orders for active user
 */
exports.getOrders = async (req, res) => {
    try {
        const userId = resolveUser(req);
        const { all, status, search, limit, page, sort } = req.query;

        const isAll = all === "true" || all === true;
        const query = {};

        if (!isAll && userId) {
            query.user = userId;
        }

        // Filter by status if provided (case-insensitive)
        if (status && status !== "all") {
            query.orderStatus = { $regex: new RegExp("^" + status + "$", "i") };
        }

        // Search by orderNumber, customer name, phone, or email
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: "i" };
            query.$or = [
                { orderNumber: searchRegex },
                { "shippingAddress.fullName": searchRegex },
                { "shippingAddress.phone": searchRegex },
                { "shippingAddress.email": searchRegex },
            ];
        }

        let ordersQuery = Order.find(query)
            .sort(sort === "asc" ? { createdAt: 1 } : { createdAt: -1 })
            .populate({
                path: "items.item",
                select: "serviceName price category brand model image warranty estimated_time type",
            })
            .lean();

        if (limit) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            ordersQuery = ordersQuery.skip((pageNum - 1) * limitNum).limit(limitNum);

            const [orders, total] = await Promise.all([
                ordersQuery,
                Order.countDocuments(query),
            ]);

            return res.status(200).json({
                success: true,
                count: orders.length,
                total,
                data: orders,
            });
        }

        const orders = await ordersQuery;

        return res.status(200).json({
            success: true,
            count: orders.length,
            total: orders.length,
            data: orders,
        });
    } catch (error) {
        console.error("Get orders error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch orders",
        });
    }
};

/**
 * GET /api/orders/:id
 * Get single order details
 */
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        let query = {};

        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            query.orderNumber = id.toUpperCase();
        }

        const order = await Order.findOne(query)
            .populate({
                path: "items.item",
                select: "serviceName price category brand model image warranty estimated_time type",
            })
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        console.error("Get order by id error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch order",
        });
    }
};

/**
 * PUT/PATCH /api/orders/:id/cancel
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = "Cancelled by customer" } = req.body;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            query.orderNumber = id.toUpperCase();
        }

        const order = await Order.findOne(query);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (["Delivered", "Cancelled"].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel order with status: " + order.orderStatus,
            });
        }

        order.orderStatus = "Cancelled";
        order.cancelReason = reason;
        order.timeline.push({
            status: "Cancelled",
            time: new Date(),
            note: reason,
        });

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order,
        });
    } catch (error) {
        console.error("Cancel order error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to cancel order",
        });
    }
};

/**
 * PATCH /api/orders/:id/status
 * Admin/system update order status
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const allowed = ["Placed", "Confirmed", "Processing", "Out for Delivery", "Delivered", "Cancelled"];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status. Allowed: " + allowed.join(", "),
            });
        }

        let query = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            query.orderNumber = id.toUpperCase();
        }

        const order = await Order.findOne(query);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        order.orderStatus = status;
        order.timeline.push({
            status,
            time: new Date(),
            note: note || ("Status updated to " + status),
        });

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order status updated to " + status,
            data: order,
        });
    } catch (error) {
        console.error("Update status error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update order status",
        });
    }
};
