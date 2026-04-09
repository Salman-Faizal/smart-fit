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
  "/payments/orders/:orderId/payhere-checkout",
  protect,
  paymentController.createPayHereCheckout,
);

router.post(
  "/payments/payhere-callback",
  paymentController.handlePayHereCallback,
);
router.get("/payments/payhere/success", paymentController.payHereSuccess);
router.get("/payments/payhere/cancel", paymentController.payHereCancel);

module.exports = router;
