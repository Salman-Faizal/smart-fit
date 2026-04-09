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

exports.createStripeCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.params;

    const checkoutSession = await paymentService.createStripeCheckoutSession(
      req.user.id,
      orderId,
      {
        requestOrigin: req.get("origin"),
      },
    );

    return res.status(200).json({
      message: "Stripe checkout session generated",
      ...checkoutSession,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({ message: "Missing stripe signature" });
    }

    const event = paymentService.verifyStripeWebhookEvent(signature, req.body);
    const order = await paymentService.handleStripeWebhookEvent(event);

    return res.status(200).json({
      message: "Webhook processed",
      eventType: event.type,
      orderId: order?._id,
      paymentStatus: order?.paymentStatus,
      status: order?.status,
    });
  } catch (error) {
    console.error("[Stripe] webhook processing failed", error.message);
    return res.status(error.statusCode || 400).json({
      message: error.message || "Invalid webhook",
    });
  }
};
