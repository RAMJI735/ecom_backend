const express = require("express");
const router = express.Router();
const {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} = require("../controllers/addressController");
const { protect } = require("../middleware/authMiddleware");
const wrapAsync = require("../utils/wrapAsync");

// All address operations require authentication
router.use(protect);

router.route("/")
    .get(wrapAsync(getAddresses))
    .post(wrapAsync(createAddress));

router.route("/:id")
    .get(wrapAsync(getAddressById))
    .put(wrapAsync(updateAddress))
    .patch(wrapAsync(updateAddress))
    .delete(wrapAsync(deleteAddress));

router.patch("/:id/default", wrapAsync(setDefaultAddress));
router.put("/:id/default", wrapAsync(setDefaultAddress));

module.exports = router;
