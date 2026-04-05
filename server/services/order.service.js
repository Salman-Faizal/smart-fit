const Product = require("../models/Product");

const normalizeOrderItems = (items = []) => {
  const normalizedItems = [];
  const quantityByProduct = new Map();

  for (const item of items) {
    if (!item || !item.productId || Number(item.quantity) <= 0) {
      continue;
    }

    const productId = String(item.productId);
    const quantity = Number(item.quantity);

    quantityByProduct.set(
      productId,
      (quantityByProduct.get(productId) || 0) + quantity,
    );
  }

  for (const [productId, quantity] of quantityByProduct.entries()) {
    normalizedItems.push({ productId, quantity });
  }

  return normalizedItems;
};

const validateProductStock = async (items, session = null) => {
  const productIds = items.map((item) => item.productId);

  const products = await Product.find({ _id: { $in: productIds } })
    .select("stock")
    .session(session);

  if (products.length !== items.length) {
    return { ok: false, message: "Product not found" };
  }

  const stockByProduct = new Map(
    products.map((product) => [String(product._id), product.stock]),
  );

  for (const item of items) {
    const currentStock = stockByProduct.get(String(item.productId)) || 0;

    if (currentStock < item.quantity) {
      return { ok: false, message: "Insufficient stock" };
    }
  }

  return { ok: true };
};

const decrementStockAtomically = async (item, session = null) => {
  return Product.findOneAndUpdate(
    {
      _id: item.productId,
      stock: { $gte: item.quantity },
    },
    {
      $inc: {
        stock: -item.quantity,
      },
    },
    {
      new: true,
      session,
      select: "stock",
    },
  );
};

module.exports = {
  normalizeOrderItems,
  validateProductStock,
  decrementStockAtomically,
};
