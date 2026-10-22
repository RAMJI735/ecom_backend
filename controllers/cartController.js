const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Cart = require("../model/cart/cartModal");
const Service = require("../model/Service/ServiceModal");
const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");

/**
 * Helper to identify userId and/or guestId from request:
 * - Express request user (if auth middleware is present)
 * - JWT Authorization header or cookie
 * - Explicit query params, body, or route params
 * - Guest identifier (header x-guest-id or body/query guestId)
 */
const resolveUserOrGuest = (req) => {
    let userId = req.user?.id || req.user?._id || req.params?.userId || req.query?.userId || req.body?.userId || null;
    let guestId = req.headers["x-guest-id"] || req.query?.guestId || req.body?.guestId || null;

    // Check token from headers if userId is not explicitly provided
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
                // Token invalid or expired; proceed with guest or explicit IDs
            }
        }
    }

    return { userId, guestId };
};

/**
 * Common populate configuration for cart items
 */
const cartPopulateOptions = {
    path: "items.item",
    select: "serviceName price category brand model image status warranty estimated_time type",
};

/**
 * Helper to find active cart for user or guest
 */
const findCart = async (userId, guestId) => {
    const filter = { status: { $in: ["active", "Pending"] } };

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = userId;
    } else if (guestId) {
        filter.guestId = guestId;
    } else {
        return null;
    }

    return await Cart.findOne(filter).populate(cartPopulateOptions);
};

// GET /api/cart - Get current user/guest cart
exports.getCart = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!userId && !guestId) {
            return res.status(200).json({
                success: true,
                message: "No user or guest identifier provided; returning empty cart template",
                data: {
                    items: [],
                    totalQuantity: 0,
                    totalPrice: 0,
                    discount: 0,
                    shippingFee: 0,
                    tax: 0,
                    grandTotal: 0,
                },
            });
        }

        let cart = await findCart(userId, guestId);

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty",
                data: {
                    user: userId || null,
                    guestId: guestId || null,
                    items: [],
                    totalQuantity: 0,
                    totalPrice: 0,
                    discount: 0,
                    shippingFee: 0,
                    tax: 0,
                    grandTotal: 0,
                },
            });
        }

        res.set("Cache-Control", "private, no-store");
        return res.status(200).json({
            success: true,
            data: cart,
        });
    } catch (error) {
        console.error("Error retrieving cart:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve cart",
        });
    }
};

// POST /api/cart/add or POST /api/cart - Add item (service or product) to cart
exports.addToCart = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!userId && !guestId) {
            return res.status(400).json({
                success: false,
                message: "User ID or Guest ID is required to add items to cart",
            });
        }

        const {
            itemId,
            serviceId,
            productId,
            item,
            name,
            serviceName,
            price,
            quantity = 1,
            image,
            category,
            type,
            itemType,
            notes,
        } = req.body;

        // Resolve item reference ID (supports itemId, serviceId, productId, or item)
        const targetItemId = itemId || serviceId || productId || item;

        if (!targetItemId) {
            return res.status(400).json({
                success: false,
                message: "Item ID (itemId, serviceId, or productId) is required",
            });
        }

        const resolvedQty = Math.max(1, parseInt(quantity, 10) || 1);

        // Run item resolution and existing cart lookup in parallel
        const itemPromise = mongoose.Types.ObjectId.isValid(targetItemId)
            ? Service.findById(targetItemId).lean()
            : Service.findOne({
                $or: [
                    { sku: String(targetItemId).trim() },
                    { model: String(targetItemId).trim() },
                    { serviceName: name || serviceName || targetItemId },
                ],
            }).lean();

        const cartPromise = Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        let [itemDoc, cart] = await Promise.all([itemPromise, cartPromise]);

        // If not found in catalog, auto-provision product/service so mock items and custom materials succeed
        if (!itemDoc) {
            let catDoc = null;
            if (category && mongoose.Types.ObjectId.isValid(category)) {
                catDoc = await ServiceCategory.findById(category).lean();
            }
            if (!catDoc) {
                catDoc = (await ServiceCategory.findOne({ categoryName: /Electrical|Cable|Switch/i }).lean()) || (await ServiceCategory.findOne().lean());
            }

            const itemName = (name || serviceName || `Electrical Material (${targetItemId})`).trim();
            const itemPrice = price !== undefined && Number(price) >= 0 ? Number(price) : 100;
            const itemTypeVal = (type || itemType || "product").toLowerCase();

            try {
                const createdService = await Service.create({
                    serviceName: itemName,
                    category: catDoc ? catDoc._id : new mongoose.Types.ObjectId(),
                    brand: req.body.brand || "Voltline",
                    price: itemPrice,
                    sku: String(targetItemId).trim(),
                    image: image || "",
                    type: itemTypeVal,
                    status: "active",
                });
                itemDoc = createdService.toObject ? createdService.toObject() : createdService;
            } catch (err) {
                itemDoc = await Service.findOne().lean();
            }
        }

        if (!itemDoc) {
            return res.status(404).json({
                success: false,
                message: "Specified item could not be retrieved from catalog",
            });
        }

        if (itemDoc.status === "inactive") {
            return res.status(400).json({
                success: false,
                message: "This item is currently unavailable",
            });
        }

        const resolvedName = name || serviceName || itemDoc.serviceName;
        const resolvedPrice = price !== undefined ? Number(price) : itemDoc.price;
        const resolvedImage = image || itemDoc.image || "";
        const resolvedCategory = category || itemDoc.category || "";
        const resolvedType = (type || itemType || itemDoc.type || "service").toLowerCase();

        // Initialize new cart if none was found
        if (!cart) {
            cart = new Cart({
                user: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
                guestId: guestId || null,
                items: [],
                status: "active",
            });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            (i) => i.item && itemDoc._id && i.item.toString() === itemDoc._id.toString()
        );

        if (existingItemIndex > -1) {
            // Increment quantity
            cart.items[existingItemIndex].quantity += resolvedQty;
            if (notes) {
                cart.items[existingItemIndex].notes = notes;
            }
        } else {
            // Add new cart item with name, type (service/product), and item reference
            cart.items.push({
                item: itemDoc._id,
                name: resolvedName,
                type: resolvedType,
                price: resolvedPrice,
                quantity: resolvedQty,
                image: resolvedImage,
                category: resolvedCategory,
                notes: notes || "",
            });
        }

        await cart.save();
        await cart.populate(cartPopulateOptions);

        return res.status(200).json({
            success: true,
            message: "Item added to cart successfully",
            data: cart,
        });
    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add item to cart",
        });
    }
};

// PUT/PATCH /api/cart/items/:itemId - Update item quantity or notes
exports.updateCartItem = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);
        const targetId = req.params.itemId || req.body.itemId;
        const { quantity, notes } = req.body;

        if (!targetId) {
            return res.status(400).json({
                success: false,
                message: "Cart item ID is required",
            });
        }

        let cart = await Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        // Match by subdocument _id or referenced item ID
        const item = cart.items.find(
            (i) => i._id.toString() === targetId.toString() || (i.item && i.item.toString() === targetId.toString())
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart",
            });
        }

        if (quantity !== undefined) {
            const newQty = parseInt(quantity, 10);
            if (newQty <= 0) {
                // Remove item if quantity is set to 0 or negative
                cart.items = cart.items.filter((i) => i._id.toString() !== item._id.toString());
            } else {
                item.quantity = newQty;
            }
        }

        if (notes !== undefined) {
            item.notes = notes;
        }

        await cart.save();
        await cart.populate(cartPopulateOptions);

        return res.status(200).json({
            success: true,
            message: "Cart item updated successfully",
            data: cart,
        });
    } catch (error) {
        console.error("Error updating cart item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update cart item",
        });
    }
};

// DELETE /api/cart/items/:itemId or /api/cart/remove/:itemId - Remove item from cart
exports.removeCartItem = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);
        const targetId = req.params.itemId || req.body.itemId;

        if (!targetId) {
            return res.status(400).json({
                success: false,
                message: "Cart item ID is required",
            });
        }

        let cart = await Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        const initialLength = cart.items.length;
        // Filter out item matching either subdoc _id or item reference id
        cart.items = cart.items.filter(
            (i) => i._id.toString() !== targetId.toString() && (i.item ? i.item.toString() !== targetId.toString() : true)
        );

        if (cart.items.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart",
            });
        }

        await cart.save();
        await cart.populate(cartPopulateOptions);

        return res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            data: cart,
        });
    } catch (error) {
        console.error("Error removing cart item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to remove item from cart",
        });
    }
};

// DELETE /api/cart or /api/cart/clear - Clear all items from cart
exports.clearCart = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        let cart = await Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart is already empty",
                data: {
                    items: [],
                    totalQuantity: 0,
                    totalPrice: 0,
                    discount: 0,
                    grandTotal: 0,
                },
            });
        }

        cart.items = [];
        cart.discount = 0;
        cart.couponCode = "";
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            data: cart,
        });
    } catch (error) {
        console.error("Error clearing cart:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to clear cart",
        });
    }
};

// POST /api/cart/apply-coupon - Apply coupon / discount
exports.applyCoupon = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);
        const { couponCode, discountAmount, discountPercent } = req.body;

        if (!couponCode) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required",
            });
        }

        let cart = await Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot apply coupon to an empty cart",
            });
        }

        let calculatedDiscount = 0;
        if (discountAmount !== undefined) {
            calculatedDiscount = Math.min(cart.totalPrice, Number(discountAmount) || 0);
        } else if (discountPercent !== undefined) {
            const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
            calculatedDiscount = Math.round(((cart.totalPrice * pct) / 100) * 100) / 100;
        } else {
            // Default 10% promo for test coupons if no fixed rule sent
            calculatedDiscount = Math.round((cart.totalPrice * 0.1) * 100) / 100;
        }

        cart.couponCode = couponCode.toUpperCase().trim();
        cart.discount = calculatedDiscount;
        await cart.save();

        return res.status(200).json({
            success: true,
            message: `Coupon '${cart.couponCode}' applied successfully`,
            data: cart,
        });
    } catch (error) {
        console.error("Error applying coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to apply coupon",
        });
    }
};

// POST /api/cart/remove-coupon - Remove applied coupon
exports.removeCoupon = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        let cart = await Cart.findOne({
            status: { $in: ["active", "Pending"] },
            ...(userId && mongoose.Types.ObjectId.isValid(userId)
                ? { user: userId }
                : { guestId: guestId }),
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        cart.couponCode = "";
        cart.discount = 0;
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Coupon removed successfully",
            data: cart,
        });
    } catch (error) {
        console.error("Error removing coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to remove coupon",
        });
    }
};

// POST /api/cart/merge - Merge guest cart items into user cart on login
exports.mergeGuestCart = async (req, res) => {
    try {
        const { userId: resolvedUserId, guestId: resolvedGuestId } = resolveUserOrGuest(req);
        const guestId = req.body.guestId || resolvedGuestId;
        const userId = req.body.userId || resolvedUserId;

        if (!guestId || !userId) {
            const userCart = await findCart(userId, guestId);
            return res.status(200).json({
                success: true,
                message: "No cart merge required",
                data: userCart || { items: [] },
            });
        }

        const guestCart = await Cart.findOne({ guestId, status: { $in: ["active", "Pending"] } });
        if (!guestCart || guestCart.items.length === 0) {
            const userCart = await findCart(userId, null);
            return res.status(200).json({
                success: true,
                message: "No guest cart items to merge",
                data: userCart || { items: [] },
            });
        }

        let userCart = await Cart.findOne({ user: userId, status: { $in: ["active", "Pending"] } });
        if (!userCart) {
            userCart = new Cart({
                user: userId,
                items: [],
                status: "active",
            });
        }

        // Merge guest items into user items
        guestCart.items.forEach((guestItem) => {
            const existingIdx = userCart.items.findIndex(
                (item) => item.item && guestItem.item && item.item.toString() === guestItem.item.toString()
            );

            if (existingIdx > -1) {
                userCart.items[existingIdx].quantity += guestItem.quantity;
            } else {
                userCart.items.push(guestItem);
            }
        });

        await userCart.save();

        // Remove guest cart and populate user cart in parallel
        await Promise.all([
            Cart.findByIdAndDelete(guestCart._id),
            userCart.populate(cartPopulateOptions),
        ]);

        return res.status(200).json({
            success: true,
            message: "Guest cart merged with user cart successfully",
            data: userCart,
        });
    } catch (error) {
        console.error("Error merging cart:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to merge cart",
        });
    }
};
