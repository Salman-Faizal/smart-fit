const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { createOrder } = require("../controllers/order.controller");

router.post("/", protect, createOrder);

module.exports = router;
