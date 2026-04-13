const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "CART",
        "PENDING_PAYMENT",
        "PAID",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "CART",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["STRIPE", "MANUAL"],
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },
    paymentTransactionId: {
      type: String,
      default: "",
      index: true,
    },
    paymentReference: {
      type: String,
      default: "",
    },
    paymentGateway: {
      type: String,
      default: "",
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    paymentCallbackStatusCode: {
      type: String,
      default: "",
    },
    paymentCallbackRaw: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paymentSlipUrl: {
      type: String,
      default: "",
    },
    paymentSlipPublicId: {
      type: String,
      default: "",
    },
    paymentSlipResourceType: {
      type: String,
      default: "",
    },
    paymentSlipFormat: {
      type: String,
      default: "",
    },
    paymentSlipUploadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ user: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
