const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Address = require("../model/address/AddressModal");
const User = require("../model/User/UserModal");

// Indian phone regex: starts with 6-9, 10 digits
const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
// Indian 6-digit PIN code: 1-9 followed by 5 digits
const pinCodeRegex = /^[1-9][0-9]{5}$/;

/**
 * Helper to identify userId and/or guestId from request
 */
const resolveUserOrGuest = (req) => {
    let userId = req.user?.id || req.user?._id || req.params?.userId || req.query?.userId || req.body?.userId || null;
    let guestId = req.headers["x-guest-id"] || req.query?.guestId || req.body?.guestId || null;

    if (!userId) {
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers.cookie) {
            const match = req.headers.cookie.match(/token=([^;]+)/);
            if (match) {
                token = match[1];
            }
        }

        if (token) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || "electrical_ecom_secret_key_2026"
                );
                if (decoded && (decoded.id || decoded._id)) {
                    userId = decoded.id || decoded._id;
                }
            } catch (err) {
                // Ignore invalid token
            }
        }
    }

    return { userId, guestId };
};

/**
 * Validation helper for address payloads
 */
const validateAddressFields = ({
    fullName,
    phone,
    alternatePhone,
    street,
    city,
    state,
    postalCode,
    pincode,
    coordinates,
    latitude,
    longitude,
    addressType,
}) => {
    const errors = [];

    // Full Name
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
        errors.push("Full name is required and must be at least 2 characters long");
    } else if (fullName.trim().length > 100) {
        errors.push("Full name cannot exceed 100 characters");
    }

    // Phone
    const resolvedPhone = phone ? String(phone).trim() : "";
    if (!resolvedPhone) {
        errors.push("Primary contact phone number is required");
    } else if (!phoneRegex.test(resolvedPhone)) {
        errors.push("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
    }

    // Alternate Phone (optional, but if present must be valid)
    if (alternatePhone && String(alternatePhone).trim()) {
        const alt = String(alternatePhone).trim();
        if (!phoneRegex.test(alt)) {
            errors.push("Alternate phone must be a valid 10-digit mobile number");
        }
    }

    // Street / Site
    if (!street || typeof street !== "string" || street.trim().length < 5) {
        errors.push("Street / Site address is required and must be at least 5 characters for accurate delivery");
    } else if (street.trim().length > 250) {
        errors.push("Street address cannot exceed 250 characters");
    }

    // City
    if (!city || typeof city !== "string" || city.trim().length < 2) {
        errors.push("City name is required (at least 2 characters)");
    } else if (city.trim().length > 60) {
        errors.push("City name cannot exceed 60 characters");
    }

    // State
    if (state && typeof state === "string" && state.trim().length > 60) {
        errors.push("State name cannot exceed 60 characters");
    }

    // Postal PIN Code
    const rawPin = postalCode || pincode;
    const resolvedPin = rawPin ? String(rawPin).trim() : "";
    if (!resolvedPin) {
        errors.push("Postal PIN code is required");
    } else if (!pinCodeRegex.test(resolvedPin)) {
        errors.push("Please enter a valid 6-digit Indian postal PIN code (cannot start with 0)");
    }

    // Address Type
    if (addressType && typeof addressType === "string") {
        const validTypes = ["home", "work", "site", "warehouse", "other"];
        if (!validTypes.includes(addressType.trim().toLowerCase())) {
            errors.push(`Invalid address type '${addressType}'. Must be one of: ${validTypes.join(", ")}`);
        }
    }

    // Coordinates validation (if provided)
    const lat = coordinates?.latitude !== undefined ? coordinates.latitude : latitude;
    const lng = coordinates?.longitude !== undefined ? coordinates.longitude : longitude;

    if (lat !== undefined && lat !== null && lat !== "") {
        const numLat = Number(lat);
        if (isNaN(numLat) || numLat < -90 || numLat > 90) {
            errors.push("Latitude must be a valid number between -90 and 90");
        }
    }

    if (lng !== undefined && lng !== null && lng !== "") {
        const numLng = Number(lng);
        if (isNaN(numLng) || numLng < -180 || numLng > 180) {
            errors.push("Longitude must be a valid number between -180 and 180");
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * GET /api/addresses
 * Get all addresses for current user or guest
 */
exports.getAddresses = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!userId && !guestId) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        const query = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            query.user = userId;
        } else if (guestId) {
            query.guestId = guestId;
        }

        const addresses = await Address.find(query).sort({ isDefault: -1, updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: addresses.length,
            data: addresses,
        });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch addresses",
        });
    }
};

/**
 * GET /api/addresses/:id
 * Get single address by ID
 */
exports.getAddressById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID format",
            });
        }

        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: address,
        });
    } catch (error) {
        console.error("Error fetching address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch address",
        });
    }
};

/**
 * POST /api/addresses
 * Create a new address with full field validations and location coordinates
 */
exports.createAddress = async (req, res) => {
    try {
        const { userId, guestId } = resolveUserOrGuest(req);

        const {
            fullName,
            phone,
            alternatePhone,
            street,
            landmark,
            city,
            state = "West Bengal",
            postalCode,
            pincode,
            country = "India",
            addressType = "site",
            deliveryInstructions,
            notes,
            isDefault = false,
            coordinates,
            latitude,
            longitude,
            accuracy,
            location,
        } = req.body;

        const resolvedPostalCode = postalCode || pincode;

        // Perform comprehensive field validation
        const validation = validateAddressFields({
            fullName,
            phone,
            alternatePhone,
            street,
            city,
            state,
            postalCode: resolvedPostalCode,
            coordinates,
            latitude,
            longitude,
            addressType,
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0],
                errors: validation.errors,
            });
        }

        const ownerQuery = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            ownerQuery.user = userId;
        } else if (guestId) {
            ownerQuery.guestId = guestId;
        }

        // Count existing addresses to determine if this should be default
        const existingCount = await Address.countDocuments(ownerQuery);
        const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

        if (shouldBeDefault) {
            await Address.updateMany(ownerQuery, { isDefault: false });
        }

        // Parse coordinates
        let parsedLat = null;
        let parsedLng = null;
        let parsedAccuracy = null;

        if (coordinates && typeof coordinates === "object") {
            if (coordinates.latitude !== undefined && coordinates.latitude !== null) {
                parsedLat = Number(coordinates.latitude);
            }
            if (coordinates.longitude !== undefined && coordinates.longitude !== null) {
                parsedLng = Number(coordinates.longitude);
            }
            if (coordinates.accuracy !== undefined && coordinates.accuracy !== null) {
                parsedAccuracy = Number(coordinates.accuracy);
            }
        } else {
            if (latitude !== undefined && latitude !== null && latitude !== "") {
                parsedLat = Number(latitude);
            }
            if (longitude !== undefined && longitude !== null && longitude !== "") {
                parsedLng = Number(longitude);
            }
            if (accuracy !== undefined && accuracy !== null && accuracy !== "") {
                parsedAccuracy = Number(accuracy);
            }
        }

        // Check if GeoJSON location was passed
        if (
            (parsedLat === null || parsedLng === null) &&
            location &&
            Array.isArray(location.coordinates) &&
            location.coordinates.length === 2
        ) {
            parsedLng = Number(location.coordinates[0]);
            parsedLat = Number(location.coordinates[1]);
        }

        const addressData = {
            user: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
            guestId: guestId || null,
            fullName: fullName.trim(),
            phone: phone.trim(),
            alternatePhone: alternatePhone ? alternatePhone.trim() : "",
            street: street.trim(),
            landmark: landmark ? landmark.trim() : "",
            city: city.trim(),
            state: (state || "West Bengal").trim(),
            postalCode: resolvedPostalCode.trim(),
            country: (country || "India").trim(),
            addressType: addressType.toLowerCase().trim(),
            deliveryInstructions: (deliveryInstructions || notes || "").trim(),
            isDefault: shouldBeDefault,
        };

        if (parsedLat !== null && parsedLng !== null && !isNaN(parsedLat) && !isNaN(parsedLng)) {
            addressData.coordinates = {
                latitude: parsedLat,
                longitude: parsedLng,
                accuracy: parsedAccuracy,
            };
            addressData.location = {
                type: "Point",
                coordinates: [parsedLng, parsedLat],
                formattedAddress: `${street.trim()}, ${city.trim()}`,
            };
        }

        const newAddress = new Address(addressData);
        await newAddress.save();

        // Sync into User model addresses array if user is authenticated
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            try {
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        addresses: {
                            street: newAddress.street,
                            city: newAddress.city,
                            state: newAddress.state,
                            postalCode: newAddress.postalCode,
                            country: newAddress.country,
                            isDefault: shouldBeDefault,
                        },
                    },
                });
            } catch (userSyncErr) {
                // Non-fatal sync
            }
        }

        return res.status(201).json({
            success: true,
            message: "Delivery / site address saved successfully",
            data: newAddress,
        });
    } catch (error) {
        console.error("Error creating address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create address",
        });
    }
};

/**
 * PUT/PATCH /api/addresses/:id
 * Update an existing address with validation and location coordinates
 */
exports.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID",
            });
        }

        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        const {
            fullName,
            phone,
            alternatePhone,
            street,
            landmark,
            city,
            state,
            postalCode,
            pincode,
            country,
            addressType,
            deliveryInstructions,
            notes,
            isDefault,
            coordinates,
            latitude,
            longitude,
            accuracy,
            location,
        } = req.body;

        // Validate any updated fields
        const validation = validateAddressFields({
            fullName: fullName !== undefined ? fullName : address.fullName,
            phone: phone !== undefined ? phone : address.phone,
            alternatePhone: alternatePhone !== undefined ? alternatePhone : address.alternatePhone,
            street: street !== undefined ? street : address.street,
            city: city !== undefined ? city : address.city,
            state: state !== undefined ? state : address.state,
            postalCode: (postalCode || pincode) !== undefined ? (postalCode || pincode) : address.postalCode,
            coordinates: coordinates !== undefined ? coordinates : address.coordinates,
            latitude: latitude !== undefined ? latitude : undefined,
            longitude: longitude !== undefined ? longitude : undefined,
            addressType: addressType !== undefined ? addressType : address.addressType,
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0],
                errors: validation.errors,
            });
        }

        const ownerQuery = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            ownerQuery.user = userId;
        } else if (guestId) {
            ownerQuery.guestId = guestId;
        }

        if (isDefault) {
            await Address.updateMany(ownerQuery, { isDefault: false });
            address.isDefault = true;
        }

        if (fullName !== undefined) address.fullName = fullName.trim();
        if (phone !== undefined) address.phone = phone.trim();
        if (alternatePhone !== undefined) address.alternatePhone = alternatePhone.trim();
        if (street !== undefined) address.street = street.trim();
        if (landmark !== undefined) address.landmark = landmark.trim();
        if (city !== undefined) address.city = city.trim();
        if (state !== undefined) address.state = state.trim();
        if (postalCode !== undefined || pincode !== undefined) {
            address.postalCode = (postalCode || pincode).trim();
        }
        if (country !== undefined) address.country = country.trim();
        if (addressType !== undefined) address.addressType = addressType.toLowerCase().trim();
        if (deliveryInstructions !== undefined || notes !== undefined) {
            address.deliveryInstructions = (deliveryInstructions || notes || "").trim();
        }

        // Coordinate updates
        let parsedLat = null;
        let parsedLng = null;
        let parsedAccuracy = null;

        if (coordinates && typeof coordinates === "object") {
            if (coordinates.latitude !== undefined && coordinates.latitude !== null) {
                parsedLat = Number(coordinates.latitude);
            }
            if (coordinates.longitude !== undefined && coordinates.longitude !== null) {
                parsedLng = Number(coordinates.longitude);
            }
            if (coordinates.accuracy !== undefined && coordinates.accuracy !== null) {
                parsedAccuracy = Number(coordinates.accuracy);
            }
        } else {
            if (latitude !== undefined && latitude !== null && latitude !== "") {
                parsedLat = Number(latitude);
            }
            if (longitude !== undefined && longitude !== null && longitude !== "") {
                parsedLng = Number(longitude);
            }
            if (accuracy !== undefined && accuracy !== null && accuracy !== "") {
                parsedAccuracy = Number(accuracy);
            }
        }

        if (
            (parsedLat === null || parsedLng === null) &&
            location &&
            Array.isArray(location.coordinates) &&
            location.coordinates.length === 2
        ) {
            parsedLng = Number(location.coordinates[0]);
            parsedLat = Number(location.coordinates[1]);
        }

        if (parsedLat !== null && parsedLng !== null && !isNaN(parsedLat) && !isNaN(parsedLng)) {
            address.coordinates = {
                latitude: parsedLat,
                longitude: parsedLng,
                accuracy: parsedAccuracy,
            };
            address.location = {
                type: "Point",
                coordinates: [parsedLng, parsedLat],
                formattedAddress: `${address.street}, ${address.city}`,
            };
        }

        await address.save();

        return res.status(200).json({
            success: true,
            message: "Address updated successfully",
            data: address,
        });
    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update address",
        });
    }
};

/**
 * DELETE /api/addresses/:id
 * Delete an address
 */
exports.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID",
            });
        }

        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        const wasDefault = address.isDefault;
        await Address.findByIdAndDelete(id);

        const ownerQuery = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            ownerQuery.user = userId;
        } else if (guestId) {
            ownerQuery.guestId = guestId;
        }

        // If default address was deleted, promote first remaining address to default
        if (wasDefault) {
            const nextAddress = await Address.findOne(ownerQuery).sort({ createdAt: -1 });
            if (nextAddress) {
                nextAddress.isDefault = true;
                await nextAddress.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete address",
        });
    }
};

/**
 * PATCH /api/addresses/:id/default
 * Set an address as default
 */
exports.setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, guestId } = resolveUserOrGuest(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID",
            });
        }

        const address = await Address.findById(id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        const ownerQuery = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            ownerQuery.user = userId;
        } else if (guestId) {
            ownerQuery.guestId = guestId;
        }

        await Address.updateMany(ownerQuery, { isDefault: false });
        address.isDefault = true;
        await address.save();

        return res.status(200).json({
            success: true,
            message: "Default address updated successfully",
            data: address,
        });
    } catch (error) {
        console.error("Error setting default address:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to set default address",
        });
    }
};
