const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: [true, "Item reference ID is required"],
        },
        name: {
            type: String,
            required: [true, "Item name is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: {
                values: ["service", "product"],
                message: "{VALUE} is not a valid type. Must be 'service' or 'product'.",
            },
            default: "service",
        },
        price: {
            type: Number,
            required: [true, "Item price is required"],
            min: [0, "Price cannot be negative"],
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [1, "Quantity must be at least 1"],
            default: 1,
        },
        image: {
            type: String,
            trim: true,
            default: "",
        },
        category: {
            type: String,
            trim: true,
            default: "",
        },
        itemTotal: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        _id: true,
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual alias so `itemId`, `service`, or `product` can still be read
cartItemSchema.virtual("itemId").get(function () {
    return this.item;
});
cartItemSchema.virtual("service").get(function () {
    return this.item;
});
cartItemSchema.virtual("product").get(function () {
    return this.item;
});
cartItemSchema.virtual("itemType").get(function () {
    return this.type;
});

// Auto-calculate itemTotal before validation
cartItemSchema.pre("validate", function () {
    const qty = this.quantity && this.quantity > 0 ? this.quantity : 1;
    const price = this.price && this.price >= 0 ? this.price : 0;
    this.itemTotal = qty * price;
});

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        guestId: {
            type: String,
            trim: true,
            default: null,
        },
        items: [cartItemSchema],
        totalQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalPrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        couponCode: {
            type: String,
            trim: true,
            default: "",
        },
        shippingFee: {
            type: Number,
            default: 0,
            min: 0,
        },
        tax: {
            type: Number,
            default: 0,
            min: 0,
        },
        grandTotal: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["active", "Pending", "Confirmed", "Cancelled", "Completed", "ordered"],
            default: "active",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Method to recalculate cart summary totals
cartSchema.methods.calculateTotals = function () {
    let totalQty = 0;
    let subtotal = 0;

    if (Array.isArray(this.items)) {
        this.items.forEach((item) => {
            const qty = item.quantity && item.quantity > 0 ? Number(item.quantity) : 1;
            const price = item.price && item.price >= 0 ? Number(item.price) : 0;
            item.itemTotal = qty * price;
            totalQty += qty;
            subtotal += item.itemTotal;
        });
    }

    this.totalQuantity = totalQty;
    this.totalPrice = Math.round(subtotal * 100) / 100;

    const discount = this.discount && this.discount > 0 ? Number(this.discount) : 0;
    const shipping = this.shippingFee && this.shippingFee > 0 ? Number(this.shippingFee) : 0;
    const tax = this.tax && this.tax > 0 ? Number(this.tax) : 0;

    this.grandTotal = Math.max(0, Math.round((this.totalPrice - discount + shipping + tax) * 100) / 100);
};

// Pre-save hook to ensure totals are always up to date
cartSchema.pre("save", function () {
    this.calculateTotals();
});

// Performance compound indexes for cart lookup by user/guest and status
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ guestId: 1, status: 1 });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
