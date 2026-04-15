const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const orderController = require("../controllers/order.controller");

router.post("/orders/cart", protect, orderController.addToCart);
router.get("/orders/cart", protect, orderController.getCart);
router.put("/orders/cart/:itemId", protect, orderController.updateCartItem);
router.delete("/orders/cart/:itemId", protect, orderController.removeCartItem);
router.post("/orders/checkout", protect, orderController.checkoutOrder);
router.get("/orders/my", protect, orderController.getOrdersByUser);
router.get("/orders/:orderId", protect, orderController.getOrderById);
router.patch("/orders/:orderId/mark-paid", protect, orderController.markOrderPaid);

router.get(
  "/admin/orders",
  protect,
  authorize(["admin"]),
  orderController.getAllOrders,
);
router.put(
  "/admin/orders/:id",
  protect,
  authorize(["admin"]),
  orderController.updateOrderStatus,
);

module.exports = router;
