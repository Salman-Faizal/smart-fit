const Product = require("../models/Product");
const User = require("../models/User");
const { prependUniqueWithLimit } = require("../services/userTracking.service");
const { destroyCloudinaryAssets } = require("../utils/cloudinaryAsset");

const mapUploadedFiles = (files = []) => {
  return files.map((file) => ({
    url: file.path || file.secure_url,
    publicId: file.filename || file.public_id,
  }));
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body || {};

    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        message: "name, category, price and stock are required",
      });
    }

    const uploadedImages = mapUploadedFiles(req.files || []);

    const product = await Product.create({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      images: uploadedImages.map((image) => image.url),
      imagePublicIds: uploadedImages.map((image) => image.publicId),
    });

    return res.status(201).json(product);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to create product" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    let query = {};
    const {
      category,
      search,
      sort,
      dateRange,
      page = 1,
      limit = 10,
    } = req.query;

    if (category) {
      const categories = category
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (categories.length > 1) {
        query.category = { $in: categories };
      } else if (categories.length === 1) {
        query.category = categories[0];
      }
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (dateRange) {
      const now = new Date();
      const dateThreshold = new Date(now);

      if (dateRange === "last_week") {
        dateThreshold.setDate(now.getDate() - 7);
        query.createdAt = { $gte: dateThreshold };
      } else if (dateRange === "last_month") {
        dateThreshold.setMonth(now.getMonth() - 1);
        query.createdAt = { $gte: dateThreshold };
      }
    }

    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      views_desc: { views: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      popular_desc: { views: -1, purchases: -1, createdAt: -1 },
    };
    const sortQuery = sortOptions[sort] || { createdAt: -1 };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortQuery).skip(skip).limit(limitNumber),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      products,
      total,
      page: pageNumber,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const shouldTrack = req.user?.role !== "admin";

    const product = shouldTrack
      ? await Product.findByIdAndUpdate(
          id,
          { $inc: { views: 1 } },
          { new: true },
        )
      : await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (shouldTrack && req.user?.id && req.user?.role === "customer") {
      const user = await User.findById(req.user.id).select(
        "recentlyViewed viewedProducts",
      );

      if (user) {
        user.recentlyViewed = prependUniqueWithLimit(
          user.recentlyViewed,
          product._id,
          10,
        );
        user.viewedProducts = prependUniqueWithLimit(
          user.viewedProducts,
          product._id,
        );

        await user.save();
      }
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error("getSingleProduct failed", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }

    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, stock } = req.body || {};

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = Number(price);
    if (stock !== undefined) updates.stock = Number(stock);

    if (
      Object.keys(updates).length === 0 &&
      (!req.files || req.files.length === 0)
    ) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = mapUploadedFiles(req.files);
      updates.images = uploadedImages.map((image) => image.url);
      updates.imagePublicIds = uploadedImages.map((image) => image.publicId);

      await destroyCloudinaryAssets(product.imagePublicIds || []);
    }

    Object.assign(product, updates);
    await product.save();

    return res.status(200).json(product);
  } catch (_err) {
    return res.status(400).json({ message: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await destroyCloudinaryAssets(product.imagePublicIds || []);

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (_err) {
    return res.status(400).json({ message: "Failed to delete product" });
  }
};
