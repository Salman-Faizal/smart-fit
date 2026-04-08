const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const recommendationRoutes = require("./recommendation.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");

// mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", recommendationRoutes);
router.use("/products", productRoutes);
router.use("/", orderRoutes);

module.exports = router;
