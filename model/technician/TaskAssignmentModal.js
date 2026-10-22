const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema(
    {
        ticketId: {
            type: String,
            unique: true,
            trim: true,
            index: true,
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            default: null,
        },
        serviceName: {
            type: String,
            required: [true, "Service name is required"],
            trim: true,
            minlength: [2, "Service name must be at least 2 characters long"],
            maxlength: [150, "Service name cannot exceed 150 characters"],
        },
        customer: {
            name: {
                type: String,
                required: [true, "Customer name is required"],
                trim: true,
                minlength: [2, "Customer name must be at least 2 characters long"],
                maxlength: [100, "Customer name cannot exceed 100 characters"],
            },
            phone: {
                type: String,
                required: [true, "Customer phone number is required"],
                trim: true,
                minlength: [7, "Phone number must be at least 7 digits"],
                maxlength: [15, "Phone number cannot exceed 15 digits"],
            },
            email: {
                type: String,
                trim: true,
                default: "",
                maxlength: [100, "Email cannot exceed 100 characters"],
            },
            address: {
                type: String,
                trim: true,
                default: "",
                maxlength: [300, "Address cannot exceed 300 characters"],
            },
            city: {
                type: String,
                trim: true,
                default: "",
                maxlength: [80, "City name cannot exceed 80 characters"],
            },
            pincode: {
                type: String,
                trim: true,
                default: "",
                maxlength: [12, "Pincode cannot exceed 12 characters"],
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
        },
        technician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Technician",
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: {
                values: ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"],
                message: "{VALUE} is not a valid task status",
            },
            default: "Pending",
            index: true,
        },
        priority: {
            type: String,
            enum: {
                values: ["Low", "Normal", "Medium", "High", "Critical"],
                message: "{VALUE} is not a valid priority level",
            },
            default: "Normal",
            index: true,
        },
        scheduledDate: {
            type: Date,
            default: Date.now,
        },
        assignedAt: {
            type: Date,
            default: null,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        estimatedCost: {
            type: Number,
            default: 0,
            min: [0, "Cost cannot be negative"],
        },
        finalCost: {
            type: Number,
            default: 0,
            min: [0, "Cost cannot be negative"],
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "waived"],
            default: "pending",
        },
        notes: {
            type: String,
            trim: true,
            default: "",
            maxlength: [1000, "Notes cannot exceed 1000 characters"],
        },
        completionNotes: {
            type: String,
            trim: true,
            default: "",
            maxlength: [1000, "Completion notes cannot exceed 1000 characters"],
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Performance indexes
taskAssignmentSchema.index({ status: 1, createdAt: -1 });
taskAssignmentSchema.index({ technician: 1, status: 1 });
taskAssignmentSchema.index({ scheduledDate: 1 });

// Auto-generate human-readable ticketId (e.g. SR-1021) before validation if missing
taskAssignmentSchema.pre("validate", async function () {
    if (!this.ticketId) {
        const count = await mongoose.model("TaskAssignment").countDocuments();
        this.ticketId = `SR-${1001 + count}`;
    }
});

taskAssignmentSchema.virtual("taskName").get(function () {
    return this.serviceName;
});
taskAssignmentSchema.virtual("customerName").get(function () {
    return this.customer?.name || "";
});
taskAssignmentSchema.virtual("customerPhone").get(function () {
    return this.customer?.phone || "";
});

const TaskAssignment = mongoose.model("TaskAssignment", taskAssignmentSchema);

module.exports = TaskAssignment;
