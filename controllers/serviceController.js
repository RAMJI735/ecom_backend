const mongoose = require("mongoose");
const Service = require("../model/Service/ServiceModal");
const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");
const { CloudinaryDelete, extractPublicId } = require("../utils/cloudinary");

// Create a new Service
exports.createService = async (req, res) => {
    try {
        const {
            serviceName,
            name,
            category,
            brand,
            model,
            description,
            price,
            estimated_time,
            estimatedTime,
            warranty,
            image,
            type,
            status,
        } = req.body;

        const resolvedServiceName = serviceName || name || req.body.productName;
        const { sku, stock } = req.body;
        const resolvedEstimatedTime = estimated_time || estimatedTime;

        if (!resolvedServiceName) {
            return res.status(400).json({
                success: false,
                message: "Service name is required",
            });
        }

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Service category is required",
            });
        }

        if (price === undefined || price === null) {
            return res.status(400).json({
                success: false,
                message: "Service price is required",
            });
        }

        // Verify that the specified category exists
        const categoryExists = await ServiceCategory.findById(category);
        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Specified service category does not exist",
            });
        }

        const resolvedPublicId = req.body.public_id || req.body.imagePublicId || (image ? extractPublicId(image) : "");

        const service = new Service({
            serviceName: resolvedServiceName.trim(),
            category,
            brand: brand || "VOLTLINE",
            model: model || "",
            description: description || "",
            price: Number(price),
            originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : null,
            rating: req.body.rating !== undefined ? Number(req.body.rating) : 4.8,
            reviewsCount: req.body.reviewsCount !== undefined ? Number(req.body.reviewsCount) : 48,
            badge: req.body.badge ? String(req.body.badge).trim() : (type === "service" ? "SERVICE" : "VERIFIED"),
            estimated_time: resolvedEstimatedTime || "",
            warranty: warranty || "1 Year Manufacturer",
            image: image || "",
            public_id: resolvedPublicId,
            imagePublicId: resolvedPublicId,
            images: Array.isArray(req.body.images) ? req.body.images : (image ? [image] : []),
            features: Array.isArray(req.body.features) ? req.body.features : [],
            specifications: Array.isArray(req.body.specifications) ? req.body.specifications : [],
            type: type ? type.toLowerCase() : (req.baseUrl && req.baseUrl.includes("product") ? "product" : "service"),
            sku: sku ? String(sku).trim() : "",
            stock: stock !== undefined ? Number(stock) : 10,
            inStock: req.body.inStock !== undefined ? Boolean(req.body.inStock) : true,
            status: status || "active",
        });

        const savedService = await service.save();
        const populatedService = await savedService.populate("category", "categoryName description image icon status");

        return res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: populatedService,
        });
    } catch (error) {
        console.error("Error creating service:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create service",
        });
    }
};

// Get all Services / Products (with filtering, search, pagination, and populated category)

exports.getAllServices = async (req, res) => {
    try {
        const {
            category,
            brand,
            status,
            type,
            search,
            q,
            keyword,
            name,
            minPrice,
            maxPrice,
            stockStatus,
            page,
            limit,
            all,
            sortBy = "newest",
            sortOrder,
        } = req.query;

        const query = {};

        console.log(type, "yye")
        // Category filter
        const targetCategory =
            category ||
            req.query.categoryId ||
            req.params.categoryId ||
            req.params.id;

        if (targetCategory && targetCategory !== "all") {
            const trimmedCat = String(targetCategory).trim();

            if (/^[0-9a-fA-F]{24}$/.test(trimmedCat)) {
                query.category = new mongoose.Types.ObjectId(trimmedCat);
            } else {
                const matchedCategory = await ServiceCategory.findOne({
                    categoryName: {
                        $regex: `^${trimmedCat}$`,
                        $options: "i",
                    },
                }).select("_id");

                query.category =
                    matchedCategory?._id || new mongoose.Types.ObjectId();
            }
        }

        // Status filter
        if (status && status !== "all") {
            query.status = status;
        }

        // Type filter
        if (type && type !== "all") {
            query.type = type.toLowerCase();
        } else if (req.baseUrl === "/api/products") {
            query.type = "product";
        } else if (req.baseUrl === "/api/services") {
            query.type = { $ne: "product" };
        }

        // Brand filter
        if (brand) {
            query.brand = { $regex: brand, $options: "i" };
        }

        // Stock filter
        if (stockStatus && stockStatus !== "all") {
            switch (stockStatus) {
                case "in_stock":
                    query.stock = { $gt: 10 };
                    break;

                case "low_stock":
                    query.stock = { $gt: 0, $lte: 10 };
                    break;

                case "out_of_stock":
                    query.stock = { $lte: 0 };
                    break;
            }
        }

        // Search filter
        const searchTerm = String(
            search || q || keyword || name || ""
        ).trim();

        if (searchTerm) {
            const orConditions = [
                { serviceName: { $regex: searchTerm, $options: "i" } },
                { productName: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { brand: { $regex: searchTerm, $options: "i" } },
                { model: { $regex: searchTerm, $options: "i" } },
                { sku: { $regex: searchTerm, $options: "i" } },
            ];

            const matchingCategories = await ServiceCategory.find({
                categoryName: { $regex: searchTerm, $options: "i" },
            }).select("_id");

            if (matchingCategories.length > 0) {
                orConditions.push({
                    category: {
                        $in: matchingCategories.map((item) => item._id),
                    },
                });
            }

            query.$or = orConditions;
        }

        // Price filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};

            if (minPrice !== undefined && minPrice !== "") {
                query.price.$gte = Number(minPrice);
            }

            if (maxPrice !== undefined && maxPrice !== "") {
                query.price.$lte = Number(maxPrice);
            }

            if (Object.keys(query.price).length === 0) {
                delete query.price;
            }
        }

        // Sorting
        const sortMap = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            stock_asc: { stock: 1 },
            stock_desc: { stock: -1 },
        };

        const sortOptions = sortMap[sortBy] || {
            [sortBy]: sortOrder === "asc" || sortOrder === "1" ? 1 : -1,
        };

        // Fetch all records when requested
        const isAllRequested =
            all === "true" ||
            limit === "all" ||
            limit === "0" ||
            (
                (req.query.category ||
                    req.query.categoryId ||
                    req.params.id ||
                    req.params.categoryId) &&
                page === undefined &&
                limit === undefined
            );

        query.stock > 0;

        if (isAllRequested) {
            const services = await Service.find(query)
                .populate(
                    "category",
                    "categoryName description image icon status"
                )
                .sort(sortOptions)
                .lean();

            const formatService = (service) => {
                const price = Number(service.price) || 0;
                const origPrice = service.originalPrice && Number(service.originalPrice) > price
                    ? Number(service.originalPrice)
                    : Math.round(price * 1.25);
                const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;

                return {
                    ...service,
                    name: service.serviceName || service.productName || "Electrical Item",
                    productName: service.productName || service.serviceName || "Electrical Item",
                    estimatedTime: service.estimated_time || "",
                    brand: service.brand || "VOLTLINE",
                    price,
                    originalPrice: origPrice,
                    effectiveOriginalPrice: origPrice,
                    discountPercentage: discount,
                    rating: typeof service.rating === "number" ? service.rating : 4.8,
                    reviewsCount: typeof service.reviewsCount === "number" ? service.reviewsCount : 48,
                    badge: service.badge || (service.type === "service" ? "SERVICE" : "VERIFIED"),
                    inStock: service.inStock !== false && (service.stock === undefined || service.stock > 0),
                    image: service.image || "",
                    images: Array.isArray(service.images) && service.images.length > 0 ? service.images : (service.image ? [service.image] : []),
                    features: Array.isArray(service.features) ? service.features : [],
                    specifications: Array.isArray(service.specifications) ? service.specifications : [],
                };
            };

            const data = services.map(formatService);

            return res.status(200).json({
                success: true,
                count: data.length,
                total: data.length,
                page: 1,
                limit: data.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                data,
            });
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;

        const [total, services] = await Promise.all([
            Service.countDocuments(query),
            Service.find(query)
                .populate(
                    "category",
                    "categoryName description image icon status"
                )
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        const formatService = (service) => {
            const price = Number(service.price) || 0;
            const origPrice = service.originalPrice && Number(service.originalPrice) > price
                ? Number(service.originalPrice)
                : Math.round(price * 1.25);
            const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;

            return {
                ...service,
                name: service.serviceName || service.productName || "Electrical Item",
                productName: service.productName || service.serviceName || "Electrical Item",
                estimatedTime: service.estimated_time || "",
                brand: service.brand || "VOLTLINE",
                price,
                originalPrice: origPrice,
                effectiveOriginalPrice: origPrice,
                discountPercentage: discount,
                rating: typeof service.rating === "number" ? service.rating : 4.8,
                reviewsCount: typeof service.reviewsCount === "number" ? service.reviewsCount : 48,
                badge: service.badge || (service.type === "service" ? "SERVICE" : "VERIFIED"),
                inStock: service.inStock !== false && (service.stock === undefined || service.stock > 0),
                image: service.image || "",
                images: Array.isArray(service.images) && service.images.length > 0 ? service.images : (service.image ? [service.image] : []),
                features: Array.isArray(service.features) ? service.features : [],
                specifications: Array.isArray(service.specifications) ? service.specifications : [],
            };
        };

        const data = services.map(formatService);

        const totalPages = Math.ceil(total / limitNum) || 1;

        return res.status(200).json({
            success: true,
            count: data.length,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            data,
        });
    } catch (error) {
        console.error("Error fetching services:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch services",
        });
    }
};

// Get single Service by ID (supports MongoDB ObjectId, SKU like 'p1', model, or exact name)
exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service ID is required",
            });
        }

        let service = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            service = await Service.findById(id)
                .populate("category", "categoryName description image icon status")
                .lean();
        } else {
            service = await Service.findOne({
                $or: [
                    { sku: String(id).trim() },
                    { model: String(id).trim() },
                    { serviceName: new RegExp("^" + id + "$", "i") },
                ]
            })
                .populate("category", "categoryName description image icon status")
                .lean();
        }

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service or product not found",
            });
        }

        const price = Number(service.price) || 0;
        const origPrice = service.originalPrice && Number(service.originalPrice) > price
            ? Number(service.originalPrice)
            : Math.round(price * 1.25);
        const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;

        service.name = service.serviceName;
        service.productName = service.serviceName;
        service.estimatedTime = service.estimated_time || "";
        service.brand = service.brand || "VOLTLINE";
        service.price = price;
        service.originalPrice = origPrice;
        service.effectiveOriginalPrice = origPrice;
        service.discountPercentage = discount;
        service.rating = typeof service.rating === "number" ? service.rating : 4.8;
        service.reviewsCount = typeof service.reviewsCount === "number" ? service.reviewsCount : 48;
        service.badge = service.badge || (service.type === "service" ? "SERVICE" : "VERIFIED");
        service.inStock = service.inStock !== false && (service.stock === undefined || service.stock > 0);
        service.image = service.image || "";
        service.images = Array.isArray(service.images) && service.images.length > 0 ? service.images : (service.image ? [service.image] : []);
        service.features = Array.isArray(service.features) ? service.features : [];
        service.specifications = Array.isArray(service.specifications) ? service.specifications : [];

        return res.status(200).json({
            success: true,
            data: service,
        });
    } catch (error) {
        console.error("Error fetching service:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch service",
        });
    }
};

// Update Service by ID
exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            serviceName,
            name,
            category,
            brand,
            model,
            description,
            price,
            estimated_time,
            estimatedTime,
            warranty,
            image,
            type,
            status,
        } = req.body;

        const updateData = {};
        if (serviceName || name || req.body.productName) updateData.serviceName = (serviceName || name || req.body.productName).trim();
        if (req.body.sku !== undefined) updateData.sku = String(req.body.sku).trim();
        if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);
        if (brand !== undefined) updateData.brand = brand;
        if (model !== undefined) updateData.model = model;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (estimated_time !== undefined) updateData.estimated_time = estimated_time;
        if (estimatedTime !== undefined) updateData.estimated_time = estimatedTime;
        if (warranty !== undefined) updateData.warranty = warranty;
        if (image !== undefined) {
            updateData.image = image;
            const newPid = req.body.public_id || req.body.imagePublicId || extractPublicId(image);
            if (newPid) {
                updateData.public_id = newPid;
                updateData.imagePublicId = newPid;
            }
        }
        if (req.body.public_id !== undefined || req.body.imagePublicId !== undefined) {
            updateData.public_id = req.body.public_id || req.body.imagePublicId;
            updateData.imagePublicId = req.body.public_id || req.body.imagePublicId;
        }
        if (req.body.images !== undefined) updateData.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        if (req.body.originalPrice !== undefined) updateData.originalPrice = Number(req.body.originalPrice);
        if (req.body.rating !== undefined) updateData.rating = Number(req.body.rating);
        if (req.body.reviewsCount !== undefined) updateData.reviewsCount = Number(req.body.reviewsCount);
        if (req.body.badge !== undefined) updateData.badge = String(req.body.badge).trim();
        if (req.body.inStock !== undefined) updateData.inStock = Boolean(req.body.inStock);
        if (req.body.features !== undefined) updateData.features = Array.isArray(req.body.features) ? req.body.features : [req.body.features];
        if (req.body.specifications !== undefined) updateData.specifications = req.body.specifications;
        if (type !== undefined) updateData.type = type.toLowerCase();
        if (status !== undefined) updateData.status = status;

        if (category) {
            const categoryExists = await ServiceCategory.findById(category);
            if (!categoryExists) {
                return res.status(404).json({
                    success: false,
                    message: "Specified service category does not exist",
                });
            }
            updateData.category = category;
        }

        const updatedService = await Service.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate("category", "categoryName description image icon status");

        if (!updatedService) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service updated successfully",
            data: updatedService,
        });
    } catch (error) {
        console.error("Error updating service:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update service",
        });
    }
};

// Delete Service by ID
exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        // Delete associated primary image from Cloudinary
        const publicIdToDelete = service.public_id || service.imagePublicId || extractPublicId(service.image);
        if (publicIdToDelete) {
            await CloudinaryDelete(publicIdToDelete);
        }

        // Delete any additional images in images array from Cloudinary
        if (Array.isArray(service.images) && service.images.length > 0) {
            for (const imgUrl of service.images) {
                const imgPid = extractPublicId(imgUrl);
                if (imgPid && imgPid !== publicIdToDelete) {
                    await CloudinaryDelete(imgPid);
                }
            }
        }

        const deletedService = await Service.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Service and associated images deleted successfully",
            data: deletedService,
        });
    } catch (error) {
        console.error("Error deleting service:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete service",
        });
    }
};

// Get services by category ID
exports.getServicesByCategory = async (req, res, next) => {
    req.query.category = req.params.id || req.params.categoryId;
    return exports.getAllServices(req, res, next);
};
