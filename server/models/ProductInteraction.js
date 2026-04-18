const mongoose = require("mongoose");

const productInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ["view", "wishlist", "cart", "purchase", "recommendation_click"],
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

// Primary aggregation index: group by product + event + time window
productInteractionSchema.index({ productId: 1, eventType: 1, timestamp: -1 });
// For per-user collaborative filtering queries
productInteractionSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
// TTL: expire records older than 365 days
productInteractionSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

const ProductInteraction = mongoose.model(
  "ProductInteraction",
  productInteractionSchema,
);

module.exports = ProductInteraction;
