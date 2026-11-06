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
        public_id: {
            type: String,
            trim: true,
            default: "",
        },
        imagePublicId: {
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
            deliveryCharges: {
                type: Boolean,
                default: false,
            },
            minPrice: {
                type: Number,
                default: 100,
                min: 0,
            },
            delivery_cost: {
                type: Number,
                default: 50,
                min: 0,
            },
            freeDeliveryThreshold: {
                type: Number,
                default: 100,
                min: 0,
            },
            standardDeliveryFee: {
                type: Number,
                default: 50,
                min: 0,
            },
            taxRate: {
                type: Number,
                default: 18,
                min: 0,
            },
            gstType: {
                type: String,
                enum: ["exclusive", "inclusive"],
                default: "exclusive",
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
        deliveryCharges: {
            type: Boolean,
            default: false,
        },
        minPrice: {
            type: Number,
            default: 100,
            min: 0,
        },
        delivery_cost: {
            type: Number,
            default: 50,
            min: 0,
        },
        gstType: {
            type: String,
            enum: ["exclusive", "inclusive"],
            default: "exclusive",
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

// Keep deliveryCharges, minPrice, and delivery_cost synced between commerce and top-level
settingsSchema.pre("save", function () {
    if (this.deliveryCharges !== undefined) {
        if (!this.commerce) this.commerce = {};
        this.commerce.deliveryCharges = this.deliveryCharges;
    } else if (this.commerce?.deliveryCharges !== undefined) {
        this.deliveryCharges = this.commerce.deliveryCharges;
    }

    if (this.minPrice !== undefined) {
        if (!this.commerce) this.commerce = {};
        this.commerce.minPrice = this.minPrice;
        this.commerce.freeDeliveryThreshold = this.minPrice;
    } else if (this.commerce?.minPrice !== undefined) {
        this.minPrice = this.commerce.minPrice;
    } else if (this.commerce?.freeDeliveryThreshold !== undefined) {
        this.minPrice = this.commerce.freeDeliveryThreshold;
        this.commerce.minPrice = this.commerce.freeDeliveryThreshold;
    }

    if (this.delivery_cost !== undefined) {
        if (!this.commerce) this.commerce = {};
        this.commerce.delivery_cost = this.delivery_cost;
        this.commerce.standardDeliveryFee = this.delivery_cost;
    } else if (this.commerce?.delivery_cost !== undefined) {
        this.delivery_cost = this.commerce.delivery_cost;
    } else if (this.commerce?.standardDeliveryFee !== undefined) {
        this.delivery_cost = this.commerce.standardDeliveryFee;
        this.commerce.delivery_cost = this.commerce.standardDeliveryFee;
    }

    if (this.gstType !== undefined) {
        if (!this.commerce) this.commerce = {};
        this.commerce.gstType = this.gstType;
    } else if (this.commerce?.gstType !== undefined) {
        this.gstType = this.commerce.gstType;
    }
});

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;

