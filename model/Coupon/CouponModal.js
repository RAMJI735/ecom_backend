const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "Coupon code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [3, "Coupon code must be at least 3 characters"],
            maxlength: [20, "Coupon code cannot exceed 20 characters"],
        },
        description: {
            type: String,
            trim: true,
            default: "Promotional Discount",
        },
        discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            default: "percentage",
        },
        discountValue: {
            type: Number,
            required: [true, "Discount value is required"],
            min: [1, "Discount value must be greater than 0"],
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: [0, "Minimum order value cannot be negative"],
        },
        maxDiscount: {
            type: Number,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiryDate: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        },
        usageLimit: {
            type: Number,
            default: 1000,
        },
        limit: {
            type: Number,
            default: 1000,
        },
        usedCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

couponSchema.pre("validate", function () {
    if (this.limit !== undefined && this.usageLimit === undefined) {
        this.usageLimit = this.limit;
    } else if (this.usageLimit !== undefined && this.limit === undefined) {
        this.limit = this.usageLimit;
    } else if (this.limit !== undefined && this.usageLimit !== undefined) {
        this.usageLimit = this.limit;
    }
});

couponSchema.index({ code: 1, isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;

