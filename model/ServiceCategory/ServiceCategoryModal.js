const mongoose = require("mongoose");

const serviceCategorySchema = new mongoose.Schema(
    {
        categoryName: {
            type: String,
            required: [true, "Category name is required"],
            trim: true,
            unique: true,
            minlength: [2, "Category name must be at least 2 characters long"],
            maxlength: [100, "Category name cannot exceed 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        image: {
            type: String,
            trim: true,
            default: "",
        },
        icon: {
            type: String,
            trim: true,
            default: "",
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

// Virtual alias so both `name` and `categoryName` can be accessed seamlessly
// serviceCategorySchema.virtual("name").get(function () {
//     return this.categoryName;
// });

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

module.exports = ServiceCategory;
