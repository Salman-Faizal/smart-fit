const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "view",
        "category_click",
        "search",
        "wishlist_add",
        "wishlist_remove",
        "cart_add",
        "purchase",
        "recommendation_click",
      ],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    category: {
      type: String,
      default: null,
    },
    searchQuery: {
      type: String,
      default: null,
    },
    // Flexible payload: duration, source, position, etc.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // No updatedAt needed — events are immutable append-only records
    timestamps: false,
    versionKey: false,
  },
);

// Compound index for per-user event history queries
userActivitySchema.index({ userId: 1, timestamp: -1 });
// Compound index for per-product event aggregation
userActivitySchema.index({ productId: 1, eventType: 1, timestamp: -1 });
// TTL index: auto-expire raw activity logs after 90 days to keep collection lean
userActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

module.exports = UserActivity;
