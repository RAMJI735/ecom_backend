const mongoose = require("mongoose");

const heroBannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Banner title is required"],
            trim: true,
            default: "Heavy Duty Cables & Modular Gear",
        },
        subtitle: {
            type: String,
            trim: true,
            default: "Up to 35% discount on ISI certified wires and industrial breakers.",
        },
        tag: {
            type: String,
            trim: true,
            default: "HIGH VOLTAGE DEALS",
        },
        buttonText: {
            type: String,
            trim: true,
            default: "EXPLORE WIRE CATALOG  →",
        },
        targetCategory: {
            type: String,
            trim: true,
            default: "wires",
        },
        image: {
            type: String,
            trim: true,
            default: "",
        },
        discountText: {
            type: String,
            trim: true,
            default: "Up to 35% OFF",
        },
        active: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { _id: true }
);

const assuranceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        icon: {
            type: String,
            trim: true,
            default: "shield",
        },
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    { _id: true }
);

const settingsSchema = new mongoose.Schema(
    {
        storeName: {
            type: String,
            trim: true,
            default: "VOLTLINE STORE",
        },
        tagline: {
            type: String,
            trim: true,
            default: "Certified Electrical Supplies & Parts",
        },
        supportEmail: {
            type: String,
            trim: true,
            default: "support@voltline.in",
        },
        supportPhone: {
            type: String,
            trim: true,
            default: "+91 98765 43210",
        },
        whatsappNumber: {
            type: String,
            trim: true,
            default: "+91 98765 43210",
        },
        officeAddress: {
            type: String,
            trim: true,
            default: "Sector V, Salt Lake",
        },
        city: {
            type: String,
            trim: true,
            default: "Kolkata",
        },
        state: {
            type: String,
            trim: true,
            default: "West Bengal",
        },
        pincode: {
            type: String,
            trim: true,
            default: "700091",
        },
        gstin: {
            type: String,
            trim: true,
            default: "19AAACV1234F1Z5",
        },
        announcement: {
            text: {
                type: String,
                trim: true,
                default: "⚡ NEXT-DAY DISPATCH • SITE DELIVERY AVAILABLE FOR ALL CONTRACTORS",
            },
            enabled: {
                type: Boolean,
                default: true,
            },
            type: {
                type: String,
                default: "live",
            },
        },
        heroBanners: [heroBannerSchema],
        assurances: [assuranceSchema],
        commerce: {
            freeDeliveryThreshold: {
                type: Number,
                default: 2000,
                min: 0,
            },
            standardDeliveryFee: {
                type: Number,
                default: 150,
                min: 0,
            },
            taxRate: {
                type: Number,
                default: 18,
                min: 0,
            },
            currency: {
                type: String,
                default: "INR",
            },
            currencySymbol: {
                type: String,
                default: "₹",
            },
        },
        notifications: {
            emailAlerts: {
                type: Boolean,
                default: true,
            },
            smsAlerts: {
                type: Boolean,
                default: true,
            },
        },
    },
    {
        timestamps: true,
    }
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;

