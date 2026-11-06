const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Order = require("../model/order/OrderModal");
const Cart = require("../model/cart/cartModal");
const Service = require("../model/Service/ServiceModal");
const Settings = require("../model/Settings/SettingsModal");
const Coupon = require("../model/Coupon/CouponModal");

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
        let userId = resolveUser(req);
        const {
            items: rawItems,
            shippingAddress,
            paymentMethod = "COD",
            paymentStatus = "Pending",
            transactionId = "",
            deliveryNotes = "",
            couponCode = "",
            clearCartOnSuccess = true,
            guestId = null,
        } = req.body;

        const effectiveGuestId = guestId || (userId ? null : `GUEST-${Date.now()}`);

        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city) {
            return res.status(400).json({
                success: false,
                message: "Full delivery address (name, phone, street, city) is required",
            });
        }

        let orderItems = [];

        // If items are passed explicitly (Always fetch genuine prices from database - never trust client amounts!)
        if (Array.isArray(rawItems) && rawItems.length > 0) {
            for (const itm of rawItems) {
                const itemId = itm.item || itm.itemId || itm.id || itm._id;
                let dbItem = null;

                if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
                    dbItem = await Service.findById(itemId).lean();
                } else if (itemId) {
                    dbItem = await Service.findOne({
                        $or: [
                            { sku: String(itemId).trim() },
                            { serviceName: String(itemId).trim() },
                        ],
                    }).lean();
                }

                const qty = Math.max(1, parseInt(itm.quantity, 10) || 1);
                // Genuine price from DB. Fallback to passed price only if item doc not in DB
                const genuinePrice = dbItem && dbItem.price !== undefined
                    ? Number(dbItem.price)
                    : (Number(itm.price) || 0);

                const itemTotal = Math.round(genuinePrice * qty * 100) / 100;

                orderItems.push({
                    item: dbItem ? dbItem._id : (itemId && mongoose.Types.ObjectId.isValid(itemId) ? itemId : new mongoose.Types.ObjectId()),
                    name: dbItem ? (dbItem.serviceName || dbItem.name) : (itm.name || itm.serviceName || "Electrical Service / Item"),
                    type: dbItem?.type || itm.type || "service",
                    price: genuinePrice,
                    quantity: qty,
                    image: dbItem?.image || itm.image || "",
                    category: dbItem?.category ? String(dbItem.category) : (itm.category || ""),
                    brand: dbItem?.brand || itm.brand || "",
                    itemTotal: itemTotal,
                    notes: itm.notes || "",
                });
            }
        } else if (userId) {
            // Pull from active cart and verify genuine item prices
            const filter = { status: { $in: ["active", "Pending"] }, user: userId };
            const cart = await Cart.findOne(filter);
            if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cart is empty. Please add items before checking out.",
                });
            }

            for (const i of cart.items) {
                let genuinePrice = Number(i.price) || 0;
                let dbItem = null;
                if (i.item && mongoose.Types.ObjectId.isValid(i.item)) {
                    dbItem = await Service.findById(i.item).lean();
                    if (dbItem && dbItem.price !== undefined) {
                        genuinePrice = Number(dbItem.price);
                    }
                }
                const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
                const itemTotal = Math.round(genuinePrice * qty * 100) / 100;

                orderItems.push({
                    item: i.item,
                    name: dbItem ? (dbItem.serviceName || dbItem.name) : i.name,
                    type: dbItem?.type || i.type || "service",
                    price: genuinePrice,
                    quantity: qty,
                    image: dbItem?.image || i.image || "",
                    category: dbItem?.category ? String(dbItem.category) : (i.category || ""),
                    brand: dbItem?.brand || i.brand || "",
                    itemTotal: itemTotal,
                    notes: i.notes || "",
                });
            }
        }

        if (orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order must contain at least one valid item",
            });
        }

        // Fetch dynamic commerce settings from DB
        const storeSettings = (await Settings.findOne()) || {};

        // 1. Calculate subtotal strictly on backend
        const subtotal = Math.round(orderItems.reduce((acc, curr) => acc + curr.itemTotal, 0) * 100) / 100;

        // 2. Delivery Cost Logic:
        // When admin enables delivery cost (deliveryCharges: true):
        //   - If subtotal < minPrice (e.g. < 100) -> add delivery_cost!
        //   - If subtotal >= minPrice -> delivery is FREE (0)!
        // When admin disables delivery cost (deliveryCharges: false) -> delivery is 0!
        const deliveryChargesEnabled = storeSettings.deliveryCharges !== undefined
            ? Boolean(storeSettings.deliveryCharges)
            : Boolean(storeSettings.commerce?.deliveryCharges);

        const minPrice = storeSettings.minPrice !== undefined
            ? Number(storeSettings.minPrice)
            : (storeSettings.commerce?.minPrice !== undefined
                ? Number(storeSettings.commerce.minPrice)
                : Number(storeSettings.commerce?.freeDeliveryThreshold ?? 100));

        const deliveryCostAmount = storeSettings.delivery_cost !== undefined
            ? Number(storeSettings.delivery_cost)
            : (storeSettings.commerce?.delivery_cost !== undefined
                ? Number(storeSettings.commerce.delivery_cost)
                : Number(storeSettings.commerce?.standardDeliveryFee ?? 50));

        let shippingFee = 0;
        if (deliveryChargesEnabled) {
            if (subtotal < minPrice) {
                shippingFee = deliveryCostAmount;
            } else {
                shippingFee = 0; // Free delivery threshold met
            }
        } else {
            shippingFee = 0; // Delivery charges disabled by admin
        }

        // 3. Coupon Validation & Discount Calculation on Backend
        let discount = 0;
        let appliedCouponDoc = null;

        if (couponCode) {
            const normalizedCode = couponCode.toUpperCase().trim();
            const foundCoupon = await Coupon.findOne({ code: normalizedCode, isActive: true });

            if (!foundCoupon) {
                return res.status(400).json({
                    success: false,
                    message: `Coupon code '${normalizedCode}' is invalid or has been deactivated.`,
                });
            }

            // Check expiryDate
            if (foundCoupon.expiryDate && new Date(foundCoupon.expiryDate) < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: `Coupon code '${normalizedCode}' expired on ${new Date(foundCoupon.expiryDate).toLocaleDateString()}.`,
                });
            }

            // Check coupon limit / usageLimit
            const couponLimit = foundCoupon.limit !== undefined ? foundCoupon.limit : foundCoupon.usageLimit;
            if (couponLimit !== null && couponLimit !== undefined && (foundCoupon.usedCount || 0) >= couponLimit) {
                return res.status(400).json({
                    success: false,
                    message: `Coupon code '${normalizedCode}' usage limit (${couponLimit}) has been reached.`,
                });
            }

            // Check minOrderValue
            if (subtotal < (foundCoupon.minOrderValue || 0)) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum order value of ₹${foundCoupon.minOrderValue} required for coupon '${normalizedCode}'. Current subtotal is ₹${subtotal}.`,
                });
            }

            // Calculate discount strictly on backend
            if (foundCoupon.discountType === "percentage") {
                discount = Math.round(((subtotal * foundCoupon.discountValue) / 100) * 100) / 100;
                if (foundCoupon.maxDiscount && discount > foundCoupon.maxDiscount) {
                    discount = foundCoupon.maxDiscount;
                }
            } else {
                discount = Math.min(subtotal, foundCoupon.discountValue);
            }

            appliedCouponDoc = foundCoupon;
        }

        // 4. Tax & Grand Total Calculation on Backend
        const taxRate = storeSettings.commerce?.taxRate ?? 18;
        const gstType = storeSettings.gstType || storeSettings.commerce?.gstType || "exclusive";
        const taxable = Math.max(0, subtotal - discount);
        let tax = 0;
        let grandTotal = 0;

        if (gstType === "inclusive") {
            // Prices already include GST: extract GST amount
            const taxableBase = Math.round((taxable / (1 + (taxRate / 100))) * 100) / 100;
            tax = Math.round((taxable - taxableBase) * 100) / 100;
            // Since taxable already includes tax, don't add tax again to grandTotal!
            grandTotal = Math.round((taxable + shippingFee) * 100) / 100;
        } else {
            // Prices are GST exclusive: tax is added on top
            tax = Math.round((taxable * (taxRate / 100)) * 100) / 100;
            grandTotal = Math.round((taxable + tax + shippingFee) * 100) / 100;
        }

        let uniqueOrderNumber = generateOrderNumber();
        while (await Order.findOne({ orderNumber: uniqueOrderNumber })) {
            uniqueOrderNumber = generateOrderNumber();
        }

        const newOrder = new Order({
            orderNumber: uniqueOrderNumber,
            user: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
            guestId: effectiveGuestId,
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
                couponCode: appliedCouponDoc ? appliedCouponDoc.code : "",
                shippingFee,
                deliveryCost: shippingFee,
                tax,
                taxRate,
                gstType,
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

        // Increment coupon usedCount in DB after order is saved
        if (appliedCouponDoc) {
            await Coupon.findByIdAndUpdate(appliedCouponDoc._id, {
                $inc: { usedCount: 1 },
            });
        }

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
