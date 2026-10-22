const express = require("express");
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = require("../controllers/serviceCategoryController");

const { cacheControl } = require("../utils/cacheMiddleware");

// Service Category CRUD routes
router.route("/")
    .post(createCategory)
    .get(cacheControl("public, s-maxage=60, stale-while-revalidate=300"), getAllCategories);

router.route("/:id")
    .get(cacheControl("public, s-maxage=60, stale-while-revalidate=300"), getCategoryById)
    .put(updateCategory)
    .patch(updateCategory)
    .delete(deleteCategory);

const mongoose = require("mongoose");
const ServiceCategory = require("../model/ServiceCategory/ServiceCategoryModal");
const { getAllServices } = require("../controllers/serviceController");

// Get services under a specific category
router.get("/:id/services", async (req, res, next) => {
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
        return getAllServices(req, res, next);
    } catch (error) {
        return next(error);
    }
});

// Get products under a specific category
router.get("/:id/products", async (req, res, next) => {
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
