const express = require("express");
const router = express.Router();
const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} = require("../controllers/couponController");

router.route("/")
    .get(getCoupons)
    .post(createCoupon);

router.post("/validate", validateCoupon);

router.route("/:id")
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;

