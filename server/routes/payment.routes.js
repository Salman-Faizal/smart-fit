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

module.exports = router;
