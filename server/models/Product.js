const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    image: [String], // image URLs (file paths for now)
    views: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },
  },
  {
    Timestamp: true,
  },
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
