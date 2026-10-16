const mongoose = require("mongoose");

const technicianSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Technician name is required"],
            trim: true,
            minlength: [2, "Technician name must be at least 2 characters long"],
            maxlength: [100, "Technician name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            minlength: [5, "Email must be at least 5 characters long"],
            maxlength: [100, "Email cannot exceed 100 characters"],
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
            minlength: [7, "Phone number must be at least 7 digits"],
            maxlength: [15, "Phone number cannot exceed 15 digits"],
        },
        specialization: {
            type: [String],
            default: ["General Electrical"],
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
        avatar: {
            type: String,
            trim: true,
            default: "",
            maxlength: [500, "Avatar URL cannot exceed 500 characters"],
        },
    },
    {
        timestamps: true,
    }
);

const Technician = mongoose.model("Technician", technicianSchema);

module.exports = Technician;
