const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    primaryImage: {
      type: String,
      default: "",
    },
    primaryImagePublicId: {
      type: String,
      default: "",
    },
    secondaryImages: {
      type: [String],
      default: [],
    },
    secondaryImagePublicIds: {
      type: [String],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },
    // New tracking-backed counters populated by updateTrendingScores()
    viewCount: {
      type: Number,
      default: 0,
      index: true,
    },
    purchaseCount: {
      type: Number,
      default: 0,
    },
    wishlistCount: {
      type: Number,
      default: 0,
    },
    trendingScore: {
      type: Number,
      default: 0,
      index: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
    fit: {
      type: String,
      enum: ["Slim", "Regular", "Relaxed", "Oversized"],
      default: null,
    },
    style: {
      type: String,
      enum: ["Classic", "Streetwear", "Smart Casual", "Minimalist"],
      default: null,
    },
    occasion: {
      type: String,
      enum: ["Casual", "Formal", "Night Out", "Active"],
      default: null,
    },
    colorFamily: {
      type: String,
      enum: ["Neutrals", "Earth Tones", "Bold & Bright", "Navy & Blues"],
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for category-filtered + in-stock + trending sort.
// Hits every query in discover (pool A/B), alsoViewed fallback,
// checkoutUpsell complement fill, and forYou category scoring.
productSchema.index({ category: 1, stock: 1, trendingScore: -1 });

// Compound index for stock-filtered trending sort — used by trending endpoint,
// discover pool C, and flash-fill fallback in checkoutUpsell.
// trendingScore already has a single-field index; this covers the stock filter.
productSchema.index({ stock: 1, trendingScore: -1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
