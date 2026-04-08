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
