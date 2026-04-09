const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { appendUniqueWithLimit } = require("./userTracking.service");
const { destroyCloudinaryAsset } = require("../utils/cloudinaryAsset");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatAmount = (amount) => Number(amount || 0).toFixed(2);

const buildCheckoutHash = ({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}) => {
  const secretHash = crypto
    .createHash("md5")
    .update(String(merchantSecret || ""))
    .digest("hex")
    .toUpperCase();

  const raw = `${merchantId}${orderId}${formatAmount(amount)}${currency}${secretHash}`;

  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
};

const buildPayHereHash = ({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret,
}) => {
  const secretHash = crypto
    .createHash("md5")
    .update(String(merchantSecret || ""))
    .digest("hex")
    .toUpperCase();

  const raw = `${merchantId}${orderId}${formatAmount(amount)}${currency}${statusCode}${secretHash}`;

  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
};

const updatePurchaseCounts = async (items, delta, session) => {
  if (!Array.isArray(items) || !items.length || !delta) {
    return;
  }

  const operations = items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { purchases: Number(item.quantity) * delta } },
    },
  }));

  await Product.bulkWrite(operations, { session });
};

const trackPurchasedProducts = async (userId, items, session) => {
  if (!mongoose.Types.ObjectId.isValid(userId) || !Array.isArray(items)) {
    return;
  }

  const user = await User.findById(userId).select("role purchasedProducts");

  if (!user || user.role !== "customer") {
    return;
  }

  const purchasedIds = items.map((item) => item.product);
  user.purchasedProducts = appendUniqueWithLimit(
    user.purchasedProducts,
    purchasedIds,
  );

  await user.save({ session });
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

const createPayHereCheckoutPayload = async (
  userId,
  orderId,
  requestContext = {},
) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw createHttpError(400, "Invalid order id");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate("items.product")
    .populate("user", "name email");

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (order.status !== "PENDING_PAYMENT" || order.paymentMethod !== "PAYHERE") {
    throw createHttpError(
      400,
      "Order is not ready for PayHere checkout. Please checkout with PayHere first.",
    );
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const currency = process.env.PAYHERE_CURRENCY || "LKR";

  if (!merchantId || !process.env.PAYHERE_SECRET) {
    throw createHttpError(500, "PayHere environment is not configured");
  }

  const isSandbox = process.env.PAYHERE_SANDBOX !== "false";
  const amount = formatAmount(order.totalPrice);
  const itemNames = order.items
    .map((item) => item?.product?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const firstName =
    (order.user?.name || "Customer").split(" ")[0] || "Customer";
  const normalizedOrigin =
    typeof requestContext.requestOrigin === "string"
      ? requestContext.requestOrigin.trim()
      : "";
  const normalizedHost =
    typeof requestContext.requestHost === "string"
      ? requestContext.requestHost.trim()
      : "";
  const normalizedProtocol =
    requestContext.requestProtocol === "https" ? "https" : "http";
  const backendBaseUrl = normalizedHost
    ? `${normalizedProtocol}://${normalizedHost}`
    : "";
  const fallbackNotifyUrl = backendBaseUrl
    ? `${backendBaseUrl}/api/payments/payhere-callback`
    : "http://localhost:3000/api/payments/payhere-callback";
  const fallbackReturnUrl = normalizedOrigin
    ? `${normalizedOrigin}/payment/success`
    : "http://localhost:5173/payment/success";
  const fallbackCancelUrl = normalizedOrigin
    ? `${normalizedOrigin}/payment/cancel`
    : "http://localhost:5173/payment/cancel";
  const checkoutHash = buildCheckoutHash({
    merchantId,
    orderId: String(order._id),
    amount,
    currency,
    merchantSecret: process.env.PAYHERE_SECRET,
  });

  return {
    checkout_url: isSandbox
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout",
    merchant_id: merchantId,
    return_url: process.env.PAYHERE_RETURN_URL || fallbackReturnUrl,
    cancel_url: process.env.PAYHERE_CANCEL_URL || fallbackCancelUrl,
    notify_url: process.env.PAYHERE_NOTIFY_URL || fallbackNotifyUrl,
    order_id: String(order._id),
    items: itemNames || `Order ${order._id}`,
    currency,
    amount,
    first_name: firstName,
    last_name: "",
    email: order.user?.email || "customer@example.com",
    phone: "0771234567",
    address: "N/A",
    city: "Colombo",
    country: "Sri Lanka",
    custom_1: String(order.user?._id || userId),
    custom_2: "",
    hash: checkoutHash,
  };
};

const verifyPayHereCallback = (payload) => {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_SECRET;

  if (!merchantId || !merchantSecret) {
    throw createHttpError(500, "PayHere environment is not configured");
  }

  if (!payload?.md5sig) {
    throw createHttpError(400, "Missing md5 signature");
  }

  const expectedSig = buildPayHereHash({
    merchantId: payload.merchant_id,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
    merchantSecret,
  });

  return expectedSig === String(payload.md5sig || "").toUpperCase();
};

const handlePayHereCallback = async (payload = {}) => {
  if (!payload.order_id || !mongoose.Types.ObjectId.isValid(payload.order_id)) {
    throw createHttpError(400, "Invalid order reference");
  }

  const isValid = verifyPayHereCallback(payload);

  if (!isValid) {
    console.error("[PayHere] Invalid signature for callback", {
      order_id: payload.order_id,
      payment_id: payload.payment_id,
    });
    throw createHttpError(400, "Invalid callback signature");
  }

  const order = await Order.findById(payload.order_id).populate(
    "items.product",
  );

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (order.paymentMethod !== "PAYHERE") {
    throw createHttpError(400, "Order is not a PayHere order");
  }

  const statusCode = String(payload.status_code || "");
  const isSuccess = statusCode === "2";

  if (order.paymentStatus === "PAID" && isSuccess) {
    order.paymentCallbackRaw = payload;
    order.paymentCallbackStatusCode = statusCode;
    order.paymentTransactionId = String(payload.payment_id || "");
    order.paymentReference = String(payload.order_id || "");
    order.paymentGateway = "PAYHERE";
    order.paymentVerifiedAt = order.paymentVerifiedAt || new Date();
    await order.save();
    return order;
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    if (isSuccess) {
      for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session },
        );

        if (!updatedProduct) {
          throw createHttpError(400, "Insufficient stock for payment capture");
        }
      }

      await updatePurchaseCounts(order.items, 1, session);
      await trackPurchasedProducts(order.user, order.items, session);

      order.paymentStatus = "PAID";
      order.status = "PAID";
    } else {
      order.paymentStatus = "FAILED";
      order.status = "CANCELLED";
    }

    order.paymentCallbackRaw = payload;
    order.paymentCallbackStatusCode = statusCode;
    order.paymentTransactionId = String(payload.payment_id || "");
    order.paymentReference = String(payload.order_id || "");
    order.paymentGateway = "PAYHERE";
    order.paymentVerifiedAt = new Date();

    await order.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return Order.findById(order._id).populate("items.product");
};

module.exports = {
  uploadPaymentSlip,
  getPaymentSlip,
  createPayHereCheckoutPayload,
  handlePayHereCallback,
};
