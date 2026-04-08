const mongoose = require("mongoose");
const Order = require("../models/Order");
const { destroyCloudinaryAsset } = require("../utils/cloudinaryAsset");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const uploadPaymentSlip = async (userId, orderId, file) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw createHttpError(400, "Invalid order id");
  }

  if (!file) {
    throw createHttpError(400, "Payment slip file is required");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  }).populate("items.product");

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (order.paymentMethod !== "MANUAL") {
    throw createHttpError(
      400,
      "Payment slip is only required for manual payments",
    );
  }

  const oldPublicId = order.paymentSlipPublicId;
  const oldResourceType = order.paymentSlipResourceType || "raw";

  order.paymentSlipUrl = file.path || file.secure_url;
  order.paymentSlipPublicId = file.filename || file.public_id;
  order.paymentSlipResourceType =
    file.mimetype === "application/pdf" ? "raw" : "image";
  order.paymentSlipFormat = file.format || "";
  order.paymentSlipUploadedAt = new Date();

  await order.save();

  await destroyCloudinaryAsset(oldPublicId, oldResourceType);

  return order;
};

const getPaymentSlip = async (requestUser, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw createHttpError(400, "Invalid order id");
  }

  const query = { _id: orderId };

  if (requestUser.role !== "admin") {
    query.user = requestUser.id;
  }

  const order = await Order.findOne(query).select(
    "paymentSlipUrl paymentSlipPublicId paymentSlipResourceType paymentSlipFormat paymentSlipUploadedAt paymentMethod",
  );

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
};

module.exports = {
  uploadPaymentSlip,
  getPaymentSlip,
};
