const paymentService = require("../services/payment.service");

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  return res
    .status(statusCode)
    .json({ message: error.message || "Failed to process payment request" });
};

exports.uploadPaymentSlip = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await paymentService.uploadPaymentSlip(
      req.user.id,
      orderId,
      req.file,
    );

    return res.status(200).json({
      message: "Payment slip uploaded successfully",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getPaymentSlip = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await paymentService.getPaymentSlip(req.user, orderId);

    return res.status(200).json({
      paymentSlip: {
        url: order.paymentSlipUrl,
        publicId: order.paymentSlipPublicId,
        resourceType: order.paymentSlipResourceType,
        format: order.paymentSlipFormat,
        uploadedAt: order.paymentSlipUploadedAt,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.createPayHereCheckout = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payload = await paymentService.createPayHereCheckoutPayload(
      req.user.id,
      orderId,
    );

    return res.status(200).json({
      message: "PayHere checkout payload generated",
      payload,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.handlePayHereCallback = async (req, res) => {
  try {
    const order = await paymentService.handlePayHereCallback(req.body || {});

    return res.status(200).json({
      message: "Callback processed",
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
    });
  } catch (error) {
    console.error("[PayHere] callback processing failed", error.message);
    return res.status(error.statusCode || 400).json({
      message: error.message || "Invalid callback",
    });
  }
};

exports.payHereSuccess = async (req, res) => {
  return res.status(200).json({
    message:
      "Payment success redirect received. Final status will be confirmed by notify callback.",
    query: req.query,
  });
};

exports.payHereCancel = async (req, res) => {
  return res.status(200).json({
    message: "Payment cancelled or failed by user.",
    query: req.query,
  });
};
