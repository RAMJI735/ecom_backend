const mongoose = require("mongoose");

// Indian phone number regex: optional +91 / 0 followed by 10 digits starting with 6-9
const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
// Indian 6-digit PIN code regex: cannot start with 0
const pinCodeRegex = /^[1-9][0-9]{5}$/;

const addressSchema = new mongoose.Schema(
    {
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
        fullName: {
            type: String,
            required: [true, "Recipient or contractor full name is required"],
            trim: true,
            minlength: [2, "Full name must be at least 2 characters long"],
            maxlength: [100, "Full name cannot exceed 100 characters"],
        },
        phone: {
            type: String,
            required: [true, "Contact phone number is required"],
            trim: true,
            validate: {
                validator: function (v) {
                    return phoneRegex.test(v);
                },
                message: "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210)",
            },
        },
        alternatePhone: {
            type: String,
            trim: true,
            default: "",
            validate: {
                validator: function (v) {
                    if (!v || v.trim() === "") return true;
                    return phoneRegex.test(v);
                },
                message: "Please enter a valid alternate 10-digit mobile number",
            },
        },
        street: {
            type: String,
            required: [true, "Street / Plot / Site address is required"],
            trim: true,
            minlength: [5, "Street address must be at least 5 characters for accurate site delivery"],
            maxlength: [250, "Street address cannot exceed 250 characters"],
        },
        landmark: {
            type: String,
            trim: true,
            default: "",
            maxlength: [120, "Landmark cannot exceed 120 characters"],
        },
        city: {
            type: String,
            required: [true, "City is required"],
            trim: true,
            minlength: [2, "City name must be at least 2 characters"],
            maxlength: [60, "City name cannot exceed 60 characters"],
        },
        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
            minlength: [2, "State name must be at least 2 characters"],
            maxlength: [60, "State name cannot exceed 60 characters"],
            default: "West Bengal",
        },
        postalCode: {
            type: String,
            required: [true, "Postal PIN code is required"],
            trim: true,
            validate: {
                validator: function (v) {
                    return pinCodeRegex.test(v);
                },
                message: "Please enter a valid 6-digit Indian PIN code (cannot start with 0)",
            },
        },
        country: {
            type: String,
            trim: true,
            default: "India",
            maxlength: [60, "Country name cannot exceed 60 characters"],
        },
        addressType: {
            type: String,
            enum: {
                values: ["home", "work", "site", "warehouse", "other"],
                message: "{VALUE} is not a valid address type. Allowed types: home, work, site, warehouse, other",
            },
            default: "site",
            trim: true,
            lowercase: true,
        },
        deliveryInstructions: {
            type: String,
            trim: true,
            default: "",
            maxlength: [300, "Delivery instructions cannot exceed 300 characters"],
        },
        // Direct coordinates object for frontend convenience
        coordinates: {
            latitude: {
                type: Number,
                min: [-90, "Latitude must be between -90 and 90"],
                max: [90, "Latitude must be between -90 and 90"],
                default: null,
            },
            longitude: {
                type: Number,
                min: [-180, "Longitude must be between -180 and 180"],
                max: [180, "Longitude must be between -180 and 180"],
                default: null,
            },
            accuracy: {
                type: Number,
                default: null,
            },
        },
        // GeoJSON Point format for MongoDB 2dsphere spatial indexing
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            // [longitude, latitude] as per GeoJSON specification
            coordinates: {
                type: [Number],
                validate: {
                    validator: function (coords) {
                        if (!coords || coords.length === 0) return true;
                        if (coords.length !== 2) return false;
                        const [lng, lat] = coords;
                        return (
                            typeof lng === "number" &&
                            typeof lat === "number" &&
                            lng >= -180 &&
                            lng <= 180 &&
                            lat >= -90 &&
                            lat <= 90
                        );
                    },
                    message: "Coordinates must be [longitude, latitude] with longitude (-180 to 180) and latitude (-90 to 90)",
                },
                default: undefined,
            },
            formattedAddress: {
                type: String,
                trim: true,
                default: "",
            },
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual alias so pincode can still be accessed seamlessly
addressSchema.virtual("pincode").get(function () {
    return this.postalCode;
});

// Virtual alias for easy coordinate access
addressSchema.virtual("latitude").get(function () {
    return this.coordinates?.latitude ?? (this.location?.coordinates ? this.location.coordinates[1] : null);
});

addressSchema.virtual("longitude").get(function () {
    return this.coordinates?.longitude ?? (this.location?.coordinates ? this.location.coordinates[0] : null);
});

// Pre-save synchronization hook between coordinates and GeoJSON location
addressSchema.pre("save", function () {
    // If coordinates.latitude & coordinates.longitude provided, sync location.coordinates
    if (
        this.coordinates &&
        typeof this.coordinates.latitude === "number" &&
        typeof this.coordinates.longitude === "number"
    ) {
        this.location = {
            type: "Point",
            coordinates: [this.coordinates.longitude, this.coordinates.latitude],
            formattedAddress: this.location?.formattedAddress || `${this.street}, ${this.city}`,
        };
    } else if (
        this.location &&
        Array.isArray(this.location.coordinates) &&
        this.location.coordinates.length === 2
    ) {
        // Reverse sync if GeoJSON coordinates provided
        const [lng, lat] = this.location.coordinates;
        this.coordinates = {
            latitude: lat,
            longitude: lng,
            accuracy: this.coordinates?.accuracy || null,
        };
    }

    // Clean phone number to standard 10 digits
    if (this.phone) {
        const cleaned = this.phone.replace(/\D/g, "");
        if (cleaned.length >= 10) {
            this.phone = cleaned.slice(-10);
        }
    }
    if (this.alternatePhone) {
        const cleanedAlt = this.alternatePhone.replace(/\D/g, "");
        if (cleanedAlt.length >= 10) {
            this.alternatePhone = cleanedAlt.slice(-10);
        }
    }
});

// 2dsphere index for location queries
addressSchema.index({ "location": "2dsphere" }, { sparse: true });

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
