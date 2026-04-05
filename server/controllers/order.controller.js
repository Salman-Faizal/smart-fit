const mongoose = require("mongoose");
const Order = require("../models/Order");
const {
  normalizeOrderItems,
  validateProductStock,
  decrementStockAtomically,
} = require("../services/order.service");

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const items = normalizeOrderItems(req.body?.items || []);

    if (!items.length) {
      return res
        .status(400)
        .json({ message: "Order must include valid product items" });
    }

    await session.startTransaction();

    const stockValidation = await validateProductStock(items, session);

    if (!stockValidation.ok) {
      await session.abortTransaction();
      return res.status(400).json({ message: stockValidation.message });
    }

    const stockUpdates = [];

    for (const item of items) {
      const updatedProduct = await decrementStockAtomically(item, session);

      if (!updatedProduct) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Insufficient stock" });
      }

      stockUpdates.push({
        productId: item.productId,
        remainingStock: updatedProduct.stock,
      });
    }

    const [order] = await Order.create(
      [
        {
          userId: req.user.id,
          items,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      message: "Order created successfully",
      order,
      stock: stockUpdates,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ message: "Failed to create order" });
  } finally {
    session.endSession();
  }
};
