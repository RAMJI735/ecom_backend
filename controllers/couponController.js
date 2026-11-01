const Coupon = require("../model/Coupon/CouponModal");

const DEFAULT_COUPONS = [
    {
        code: "VOLT10",
        description: "10% OFF on all electrical equipment & supplies",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 999,
        maxDiscount: 500,
        isActive: true,
    },
    {
        code: "CONTRACTOR15",
        description: "15% Trade Discount for certified electrical buyers",
        discountType: "percentage",
        discountValue: 15,
        minOrderValue: 2500,
        maxDiscount: 1500,
        isActive: true,
    },
    {
        code: "SITE500",
        description: "Flat ₹500 discount on heavy industrial & wire orders above ₹5,000",
        discountType: "fixed",
        discountValue: 500,
        minOrderValue: 5000,
        isActive: true,
    },
];

// Helper to seed defaults if empty
const seedDefaultsIfEmpty = async () => {
    const count = await Coupon.countDocuments();
    if (count === 0) {
        await Coupon.insertMany(DEFAULT_COUPONS);
    }
};

// GET /api/coupons - Get all coupons (or active coupons for app)
exports.getCoupons = async (req, res) => {
    try {
        await seedDefaultsIfEmpty();
        const { active } = req.query;
        const filter = {};

        if (active === "true") {
            filter.isActive = true;
            filter.expiryDate = { $gte: new Date() };
        }

        const coupons = await Coupon.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: coupons.length,
            data: coupons,
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch coupons",
        });
    }
};

// POST /api/coupons - Create coupon
exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            isActive,
            expiryDate,
            usageLimit,
        } = req.body;

        if (!code || !discountValue) {
            return res.status(400).json({
                success: false,
                message: "Coupon code and discount value are required",
            });
        }

        const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Coupon code '${code.toUpperCase().trim()}' already exists`,
            });
        }

        const coupon = new Coupon({
            code: code.toUpperCase().trim(),
            description: description ? description.trim() : "Promotional Discount",
            discountType: discountType || "percentage",
            discountValue: Number(discountValue),
            minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            usageLimit: usageLimit !== undefined ? Number(usageLimit) : 1000,
        });

        await coupon.save();

        return res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: coupon,
        });
    } catch (error) {
        console.error("Error creating coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create coupon",
        });
    }
};

// PUT /api/coupons/:id - Update coupon
exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
        }

        const {
            code,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            isActive,
            expiryDate,
            usageLimit,
        } = req.body;

        if (code !== undefined) coupon.code = code.toUpperCase().trim();
        if (description !== undefined) coupon.description = description.trim();
        if (discountType !== undefined) coupon.discountType = discountType;
        if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
        if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue);
        if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
        if (isActive !== undefined) coupon.isActive = Boolean(isActive);
        if (expiryDate !== undefined) coupon.expiryDate = new Date(expiryDate);
        if (usageLimit !== undefined) coupon.usageLimit = Number(usageLimit);

        await coupon.save();

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: coupon,
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update coupon",
        });
    }
};

// DELETE /api/coupons/:id - Delete coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete coupon",
        });
    }
};

// POST /api/coupons/validate - Validate coupon against subtotal
exports.validateCoupon = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Coupon code is required",
            });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase().trim(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Invalid coupon code or offer has expired",
            });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "This coupon has expired",
            });
        }

        const orderSubtotal = Number(subtotal) || 0;
        if (orderSubtotal < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
            });
        }

        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = Math.round(((orderSubtotal * coupon.discountValue) / 100) * 100) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else {
            discount = Math.min(orderSubtotal, coupon.discountValue);
        }

        return res.status(200).json({
            success: true,
            message: `Coupon '${coupon.code}' is valid!`,
            data: {
                code: coupon.code,
                discount,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                description: coupon.description,
            },
        });
    } catch (error) {
        console.error("Error validating coupon:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to validate coupon",
        });
    }
};

