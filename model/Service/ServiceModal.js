const mongoose = require("mongoose");

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
            default: "",
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
            default: 0,
            min: [0, "Stock cannot be negative"],
        },
        warranty: {
            type: String,
            trim: true,
            default: "",
        },
        image: {
            type: String,
            trim: true,
            default: "",
        },
        type: {
            type: String,
            enum: {
                values: ["service", "product"],
                message: "{VALUE} is not a valid type. Allowed values are 'service' or 'product'.",
            },
            default: "service",
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
    }
);

// Virtual alias so both `name` and `serviceName` can be accessed seamlessly
serviceSchema.virtual("name").get(function () {
    return this.serviceName;
});

serviceSchema.virtual("productName").get(function () {
    return this.serviceName;
});

// Virtual alias so `estimatedTime` can be accessed seamlessly
serviceSchema.virtual("estimatedTime").get(function () {
    return this.estimated_time;
});

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
