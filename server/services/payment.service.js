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

const getStripeSecretKey = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw createHttpError(500, "Stripe is not configured");
  }

  return secretKey;
};

const toStripeAmount = (amount) => {
  const parsed = Number(amount || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createHttpError(400, "Invalid order amount for Stripe checkout");
  }

  return Math.round(parsed * 100);
};

const stripeFormEncode = (payload = {}) => {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });

  return params;
};

const createStripeCheckoutSessionRequest = async (payload) => {
  const secretKey = getStripeSecretKey();
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: stripeFormEncode(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message || "Failed to create Stripe checkout session";
    throw createHttpError(response.status || 500, message);
  }

  return data;
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

const createStripeCheckoutSession = async (
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

  const normalizedPaymentMethod =
    order.paymentMethod === "PAYHERE" ? "STRIPE" : order.paymentMethod;

  if (
    order.status !== "PENDING_PAYMENT" ||
    normalizedPaymentMethod !== "STRIPE"
  ) {
    throw createHttpError(
      400,
      "Order is not ready for Stripe checkout. Please checkout with Stripe first.",
    );
  }

  const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
  const normalizedOrigin =
    typeof requestContext.requestOrigin === "string"
      ? requestContext.requestOrigin.trim()
      : "";
  const successUrl = normalizedOrigin
    ? `${normalizedOrigin}/payment/success?order_id=${order._id}`
    : `http://localhost:5173/payment/success?order_id=${order._id}`;
  const cancelUrl = normalizedOrigin
    ? `${normalizedOrigin}/payment/cancel?order_id=${order._id}`
    : `http://localhost:5173/payment/cancel?order_id=${order._id}`;

  const payload = {
    mode: "payment",
    customer_email: order.user?.email || "",
    success_url: process.env.STRIPE_SUCCESS_URL || successUrl,
    cancel_url: process.env.STRIPE_CANCEL_URL || cancelUrl,
    "metadata[orderId]": String(order._id),
    "metadata[userId]": String(order.user?._id || userId),
    "payment_intent_data[metadata][orderId]": String(order._id),
  };
  order.items.forEach((item, index) => {
    payload[`line_items[${index}][quantity]`] = Number(item.quantity);
    payload[`line_items[${index}][price_data][currency]`] = currency;
    payload[`line_items[${index}][price_data][unit_amount]`] = toStripeAmount(
      item.price,
    );
    payload[`line_items[${index}][price_data][product_data][name]`] =
      item?.product?.name || "Smart Fit Product";
  });

  const session = await createStripeCheckoutSessionRequest(payload);

  order.paymentMethod = "STRIPE";
  order.paymentReference = session.id;
  order.paymentGateway = "STRIPE";
  await order.save();

  return {
    sessionId: session.id,
    checkoutUrl: session.url || "",
  };
};

const applyStripePaymentOutcome = async (order, payload, isSuccess) => {
  const normalizedPaymentMethod =
    order.paymentMethod === "PAYHERE" ? "STRIPE" : order.paymentMethod;
  if (normalizedPaymentMethod !== "STRIPE") {
    throw createHttpError(400, "Order is not a Stripe order");
  }

  if (order.paymentStatus === "PAID" && isSuccess) {
    order.paymentCallbackRaw = payload;
    order.paymentTransactionId = String(payload.payment_intent || "");
    order.paymentReference = String(payload.id || order.paymentReference || "");
    order.paymentGateway = "STRIPE";
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
    order.paymentTransactionId = String(payload.payment_intent || "");
    order.paymentReference = String(payload.id || order.paymentReference || "");
    order.paymentGateway = "STRIPE";
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

const handleStripeWebhookEvent = async (event = {}) => {
  const eventType = String(event?.type || "");
  const payload = event?.data?.object || {};
  const orderId = payload?.metadata?.orderId;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw createHttpError(400, "Invalid order reference");
  }

  const order = await Order.findById(orderId).populate("items.product");

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (eventType === "checkout.session.completed") {
    return applyStripePaymentOutcome(order, payload, true);
  }

  if (eventType === "checkout.session.expired") {
    return applyStripePaymentOutcome(order, payload, false);
  }

  return order;
};

const verifyStripeWebhookEvent = (signature, rawBodyBuffer) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw createHttpError(500, "Stripe webhook is not configured");
  }

  if (!signature || typeof signature !== "string") {
    throw createHttpError(400, "Missing stripe signature");
  }

  const values = signature
    .split(",")
    .map((part) => part.trim())
    .reduce((acc, entry) => {
      const [key, value] = entry.split("=");
      if (key && value) acc[key] = value;
      return acc;
    }, {});

  if (!values.t || !values.v1) {
    throw createHttpError(400, "Invalid stripe signature header");
  }

  const bodyString = Buffer.isBuffer(rawBodyBuffer)
    ? rawBodyBuffer.toString("utf8")
    : String(rawBodyBuffer || "");
  const signedPayload = `${values.t}.${bodyString}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  if (expected !== values.v1) {
    throw createHttpError(400, "Invalid Stripe webhook signature");
  }

  try {
    return JSON.parse(bodyString);
  } catch (_error) {
    throw createHttpError(400, "Invalid Stripe webhook payload");
  }
};

module.exports = {
  uploadPaymentSlip,
  getPaymentSlip,
  createStripeCheckoutSession,
  verifyStripeWebhookEvent,
  handleStripeWebhookEvent,
};
