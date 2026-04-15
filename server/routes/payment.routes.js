const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  runUpload,
  uploadPaymentSlip,
} = require("../middleware/upload.middleware");
const paymentController = require("../controllers/payment.controller");

router.post(
  "/payments/orders/:orderId/slip",
  protect,
  runUpload(uploadPaymentSlip),
  paymentController.uploadPaymentSlip,
);

router.get(
  "/payments/orders/:orderId/slip",
  protect,
  paymentController.getPaymentSlip,
);

router.post(
  "/payments/orders/:orderId/stripe-checkout-session",
  protect,
  paymentController.createStripeCheckoutSession,
);

router.post(
  "/payments/orders/:orderId/cancel",
  protect,
  paymentController.cancelStripeCheckoutOrder,
);

router.post(
  "/payments/orders/:orderId/confirm-paid",
  protect,
  paymentController.confirmStripeOrderPaid,
);

module.exports = router;
