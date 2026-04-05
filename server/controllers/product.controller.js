const Product = require("../models/Product");

exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body || {};

    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        message: "name, category, price and stock are required",
      });
    }

    const images = (req.files || []).map(
      (file) => `/uploads/products/${file.filename}`,
    );

    const product = await Product.create({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      images,
    });

    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create product" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limitNumber).sort({ createdAt: -1 }),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (err) {
    return res.status(400).json({ message: "Invalid product id" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, stock } = req.body || {};

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
      updates.images = req.files.map(
        (file) => `/uploads/products/${file.filename}`,
      );
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (err) {
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

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    return res.status(400).json({ message: "Failed to delete product" });
  }
};
