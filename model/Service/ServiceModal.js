const mongoose = require("mongoose");

const specificationSchema = new mongoose.Schema(
    {
        label: { type: String, trim: true },
        value: { type: String, trim: true },
    },
    { _id: false }
);

const serviceSchema = new mongoose.Schema(
    {
        serviceName: {
            type: String,
            required: [true, "Service name is required"],
            trim: true,
            minlength: [2, "Service name must be at least 2 characters long"],
            maxlength: [150, "Service name cannot exceed 150 characters"],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceCategory",
            required: [true, "Service category is required"],
        },
        brand: {
            type: String,
            trim: true,
            default: "VOLTLINE",
        },
        model: {
            type: String,
            trim: true,
            default: "",
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        price: {
            type: Number,
            required: [true, "Service price is required"],
            min: [0, "Price cannot be negative"],
        },
        originalPrice: {
            type: Number,
            default: null,
            min: [0, "Original price cannot be negative"],
        },
        rating: {
            type: Number,
            default: 4.8,
            min: 1,
            max: 5,
        },
        reviewsCount: {
            type: Number,
            default: 48,
            min: 0,
        },
        badge: {
            type: String,
            trim: true,
            default: "VERIFIED",
        },
        estimated_time: {
            type: String,
            trim: true,
            default: "",
        },
        sku: {
            type: String,
            trim: true,
            default: "",
        },
        stock: {
            type: Number,
            default: 10,
            min: [0, "Stock cannot be negative"],
        },
        inStock: {
            type: Boolean,
            default: true,
        },
        warranty: {
            type: String,
            trim: true,
            default: "1 Year Manufacturer",
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
        images: {
            type: [String],
            default: [],
        },
        features: {
            type: [String],
            default: [],
        },
        specifications: [specificationSchema],
        type: {
            type: String,
            enum: {
                values: ["service", "product"],
                message: "{VALUE} is not a valid type. Allowed values are 'service' or 'product'.",
            },
            default: "product",
            index: true,
        },
        status: {
            type: String,
            enum: {
                values: ["active", "inactive"],
                message: "{VALUE} is not a valid status. Allowed values are 'active' or 'inactive'.",
            },
            default: "active",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual alias so both `name` and `serviceName` can be accessed seamlessly
serviceSchema.virtual("name").get(function () {
    return this.serviceName;
});

serviceSchema.virtual("productName").get(function () {
    return this.serviceName;
});

// Dynamic virtual for effective original price if not explicitly stored
serviceSchema.virtual("effectiveOriginalPrice").get(function () {
    if (this.originalPrice && this.originalPrice > this.price) {
        return this.originalPrice;
    }
    return Math.round(this.price * 1.25);
});

// Dynamic virtual for discount percentage
serviceSchema.virtual("discountPercentage").get(function () {
    const orig = this.effectiveOriginalPrice;
    if (orig && orig > this.price) {
        return Math.round(((orig - this.price) / orig) * 100);
    }
    return 0;
});

// Performance indexes
serviceSchema.index({ category: 1, status: 1, createdAt: -1 });
serviceSchema.index({ type: 1, status: 1, createdAt: -1 });
serviceSchema.index({ status: 1, createdAt: -1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ brand: 1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
