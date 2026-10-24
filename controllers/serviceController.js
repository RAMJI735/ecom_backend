const mongoose = require("mongoose");
const Service = require("../model/Service/ServiceModal");
const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");

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

        const service = new Service({
            serviceName: resolvedServiceName.trim(),
            category,
            brand,
            model,
            description,
            price,
            estimated_time: resolvedEstimatedTime,
            warranty,
            image,
            type: type ? type.toLowerCase() : (req.baseUrl && req.baseUrl.includes("product") ? "product" : "service"),
            sku: sku ? String(sku).trim() : "",
            stock: stock !== undefined ? Number(stock) : 0,
            status,
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

        // Category filter: supports ObjectId, categoryId param, or categoryName
        const targetCategory = category || req.query.categoryId || req.params.categoryId || req.params.id;
        if (targetCategory && targetCategory !== "all") {
            const trimmedCat = String(targetCategory).trim();
            if (mongoose.Types.ObjectId.isValid(trimmedCat) && /^[0-9a-fA-F]{24}$/.test(trimmedCat)) {
                query.category = new mongoose.Types.ObjectId(trimmedCat);
            } else {
                const matchedCategory = await ServiceCategory.findOne({
                    categoryName: { $regex: new RegExp(`^${trimmedCat}$`, "i") },
                }).select("_id");

                if (matchedCategory) {
                    query.category = matchedCategory._id;
                } else {
                    query.category = new mongoose.Types.ObjectId();
                }
            }
        }

        if (status && status !== "all") {
            query.status = status;
        }

        // Determine item type (service or product)
        if (type && type !== "all") {
            query.type = type.toLowerCase();
        } else if (req.baseUrl === "/api/products") {
            query.type = "product";
        } else if (req.baseUrl === "/api/services") {
            query.type = { $ne: "product" };
        }

        if (brand) {
            query.brand = { $regex: brand, $options: "i" };
        }

        // Stock status filtering
        if (stockStatus && stockStatus !== "all") {
            if (stockStatus === "in_stock") {
                query.stock = { $gt: 10 };
            } else if (stockStatus === "low_stock") {
                query.stock = { $gt: 0, $lte: 10 };
            } else if (stockStatus === "out_of_stock") {
                query.stock = { $lte: 0 };
            }
        }

        const searchTerm = (search || q || keyword || name || "").trim();
        if (searchTerm) {
            const orConditions = [
                { serviceName: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { brand: { $regex: searchTerm, $options: "i" } },
                { model: { $regex: searchTerm, $options: "i" } },
                { sku: { $regex: searchTerm, $options: "i" } },
            ];

            // Also search by category name if available
            try {
                const matchingCategories = await ServiceCategory.find({
                    categoryName: { $regex: searchTerm, $options: "i" },
                }).select("_id");

                if (matchingCategories.length > 0) {
                    const categoryIds = matchingCategories.map((c) => c._id);
                    orConditions.push({ category: { $in: categoryIds } });
                }
            } catch (catErr) {
                // If category lookup fails, proceed with other search fields
            }

            query.$or = orConditions;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined && minPrice !== "") query.price.$gte = Number(minPrice);
            if (maxPrice !== undefined && maxPrice !== "") query.price.$lte = Number(maxPrice);
            if (Object.keys(query.price).length === 0) delete query.price;
        }

        // Dynamic sorting
        let sortOptions = { createdAt: -1 };
        if (sortBy === "price_asc") sortOptions = { price: 1 };
        else if (sortBy === "price_desc") sortOptions = { price: -1 };
        else if (sortBy === "stock_asc") sortOptions = { stock: 1 };
        else if (sortBy === "stock_desc") sortOptions = { stock: -1 };
        else if (sortBy === "oldest") sortOptions = { createdAt: 1 };
        else if (sortBy === "newest") sortOptions = { createdAt: -1 };
        else if (sortBy) {
            const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;
            sortOptions = { [sortBy]: sortDirection };
        }

        const isAllRequested =
            all === "true" ||
            limit === "all" ||
            limit === "0" ||
            limit === 0 ||
            ((req.query.category || req.params.id || req.params.categoryId) && page === undefined && limit === undefined);

        if (isAllRequested) {
            const rawServices = await Service.find(query)
                .populate("category", "categoryName description image icon status")
                .sort(sortOptions)
                .lean();

            const services = rawServices.map((s) => {
                s.name = s.serviceName;
                s.productName = s.serviceName;
                s.estimatedTime = s.estimated_time || "";
                return s;
            });

            res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
            return res.status(200).json({
                success: true,
                count: services.length,
                total: services.length,
                page: 1,
                limit: services.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                data: services,
            });
        }

        // Default pagination: page=1, limit=10
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;

        // Run count and paginated query in parallel
        const [total, rawServices] = await Promise.all([
            Service.countDocuments(query),
            Service.find(query)
                .select("serviceName price estimated_time stock warranty image")
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        // const services = rawServices.map((s) => {
        //     s.name = s.serviceName;
        //     s.productName = s.serviceName;
        //     s.estimatedTime = s.estimated_time || "";
        //     return s;
        // });

        const totalPages = Math.ceil(total / limitNum) || 1;

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            success: true,
            count: rawServices.length,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            data: rawServices,
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

        service.name = service.serviceName;
        service.productName = service.serviceName;
        service.estimatedTime = service.estimated_time || "";

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
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
        if (image !== undefined) updateData.image = image;
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
        const deletedService = await Service.findByIdAndDelete(id);

        if (!deletedService) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully",
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
