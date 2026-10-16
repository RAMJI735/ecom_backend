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

router.route("/")
    .get(getAddresses)
    .post(createAddress);

router.route("/:id")
    .get(getAddressById)
    .put(updateAddress)
    .patch(updateAddress)
    .delete(deleteAddress);

router.patch("/:id/default", setDefaultAddress);
router.put("/:id/default", setDefaultAddress);

module.exports = router;
