const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");
const Service = require("../model/Service/ServiceModal");

// Create a new Service Category
exports.createCategory = async (req, res) => {
    try {
        const { categoryName, name, description, image, icon, status } = req.body;
        const resolvedName = categoryName || name;

        if (!resolvedName) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const existingCategory = await ServiceCategory.findOne({
            categoryName: { $regex: new RegExp(`^${resolvedName.trim()}$`, "i") },
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "A category with this name already exists",
            });
        }

        const category = new ServiceCategory({
            categoryName: resolvedName.trim(),
            description,
            image,
            icon,
            status,
        });

        const savedCategory = await category.save();

        return res.status(201).json({
            success: true,
            message: "Service category created successfully",
            data: savedCategory,
        });
    } catch (error) {
        console.error("Error creating service category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create service category",
        });
    }
};

// Get all Service Categories (with filtering by status, multi-field search, pagination, and sorting)
exports.getAllCategories = async (req, res) => {
    try {
        const {
            status,
            search,
            q,
            keyword,
            page,
            limit,
            all,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const query = {};

        if (status) {
            query.status = status;
        }

        const searchTerm = (search || q || keyword || "").trim();
        if (searchTerm) {
            query.$or = [
                { categoryName: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
            ];
        }

        const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        // Check if pagination should be applied
        const isAllRequested = all === "true" || limit === "all" || limit === "0" || limit === 0;
        const shouldPaginate = !isAllRequested && (page !== undefined || limit !== undefined || req.query.paginate === "true");

        if (shouldPaginate) {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            // Execute count and paginated query in parallel
            const [total, categories] = await Promise.all([
                ServiceCategory.countDocuments(query),
                ServiceCategory.find(query)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
            ]);

            res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
            return res.status(200).json({
                success: true,
                count: categories.length,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
                data: categories,
            });
        }

        // Unpaginated: single round-trip with .lean()
        const categories = await ServiceCategory.find(query)
            .sort(sortOptions)
            .lean();

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            success: true,
            count: categories.length,
            total: categories.length,
            page: 1,
            limit: categories.length,
            totalPages: 1,
            data: categories,
        });
    } catch (error) {
        console.error("Error fetching service categories:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch service categories",
        });
    }
};

// Get single Service Category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ServiceCategory.findById(id).lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Service category not found",
            });
        }

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Error fetching service category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch service category",
        });
    }
};

// Update Service Category by ID
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, name, description, image, icon, status } = req.body;

        const updateData = {};
        if (categoryName || name) updateData.categoryName = (categoryName || name).trim();
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (icon !== undefined) updateData.icon = icon;
        if (status !== undefined) updateData.status = status;

        if (updateData.categoryName) {
            const existing = await ServiceCategory.findOne({
                categoryName: { $regex: new RegExp(`^${updateData.categoryName}$`, "i") },
                _id: { $ne: id },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Another category with this name already exists",
                });
            }
        }

        const updatedCategory = await ServiceCategory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Service category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating service category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update service category",
        });
    }
};

// Delete Service Category by ID
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;

        // Check if there are services associated with this category
        const associatedServicesCount = await Service.countDocuments({ category: id });
        if (associatedServicesCount > 0 && force !== "true") {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${associatedServicesCount} service(s) linked to this category. Pass ?force=true to delete anyway.`,
            });
        }

        const deletedCategory = await ServiceCategory.findByIdAndDelete(id);

        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: "Service category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service category deleted successfully",
            data: deletedCategory,
        });
    } catch (error) {
        console.error("Error deleting service category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete service category",
        });
    }
};
