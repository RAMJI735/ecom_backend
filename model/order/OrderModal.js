const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
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
            enum: ["service", "product"],
            default: "service",
        },
        price: {
            type: Number,
            required: [true, "Item price is required"],
            min: 0,
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: 1,
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
        brand: {
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
    { _id: true }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: [true, "Order number is required"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        guestId: {
            type: String,
            trim: true,
            default: null,
            index: true,
        },
        items: [orderItemSchema],
        shippingAddress: {
            fullName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, trim: true, default: "" },
            street: { type: String, required: true, trim: true },
            landmark: { type: String, trim: true, default: "" },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true, default: "West Bengal" },
            postalCode: { type: String, required: true, trim: true },
            country: { type: String, default: "India", trim: true },
            deliveryNotes: { type: String, default: "" },
            coordinates: {
                latitude: { type: Number, default: null },
                longitude: { type: Number, default: null },
                accuracy: { type: Number, default: null },
            },
            location: {
                type: { type: String, enum: ["Point"], default: "Point" },
                coordinates: { type: [Number], default: undefined },
                formattedAddress: { type: String, default: "" },
            },
        },
        payment: {
            method: {
                type: String,
                enum: ["COD", "UPI", "CARD", "NETBANKING"],
                default: "COD",
            },
            status: {
                type: String,
                enum: ["Pending", "Completed", "Failed", "Refunded"],
                default: "Pending",
            },
            transactionId: { type: String, default: "" },
        },
        summary: {
            subtotal: { type: Number, required: true, default: 0 },
            discount: { type: Number, default: 0 },
            couponCode: { type: String, default: "" },
            shippingFee: { type: Number, default: 0 },
            tax: { type: Number, default: 0 },
            grandTotal: { type: Number, required: true, default: 0 },
        },
        orderStatus: {
            type: String,
            enum: ["Placed", "Confirmed", "Processing", "Out for Delivery", "Delivered", "Cancelled"],
            default: "Placed",
            index: true,
        },
        timeline: [
            {
                status: { type: String, required: true },
                time: { type: Date, default: Date.now },
                note: { type: String, default: "" },
            },
        ],
        cancelReason: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
