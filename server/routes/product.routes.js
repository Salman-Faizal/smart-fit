const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { createProduct } = require("../controllers/product.controller");

router.post("/admin/products", protect, authorize(["admin"]), createProduct);

module.exports = router;
