const express = require("express");
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = require("../controllers/serviceCategoryController");

const publicCache = require("../utils/cacheMiddleware");

// Service Category CRUD routes
router.route("/")
    .post(createCategory)
    .get(publicCache, getAllCategories);

router.route("/:id")
    .get(publicCache, getCategoryById)
    .put(updateCategory)
    .patch(updateCategory)
    .delete(deleteCategory);

const mongoose = require("mongoose");
const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");
const { getAllServices } = require("../controllers/serviceController");
const Service = require("../model/Service/ServiceModal");

// Get services under a specific category

router.get("/:id/services", publicCache, async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );
        const skip = (page - 1) * limit;

        // Check category and fetch services simultaneously
        const [categoryExists, total, services] = await Promise.all([
            ServiceCategory.findById(id).select("_id").lean(),

            Service.countDocuments({ category: id }),

            Service.find({ category: id })
                .select(
                    "serviceName brand price estimated_time stock warranty image type"
                )
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Service category not found",
            });
        }

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            count: services.length,
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            data: services,
        });

    } catch (error) {
        return next(error);
    }
});


// Get products under a specific category
router.get("/:id/products", publicCache, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
        }
        const categoryExists = await ServiceCategory.findById(id);
        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Service category not found",
            });
        }
        req.query.category = id;
        req.query.type = "product";
        return getAllServices(req, res, next);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
