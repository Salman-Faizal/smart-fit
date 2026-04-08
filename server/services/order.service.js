const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const calculateTotalPrice = (cart) => {
  const totalPrice = (cart.items || []).reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  cart.totalPrice = Number(totalPrice.toFixed(2));
  return cart.totalPrice;
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

const validateStock = async (productId, quantity, session = null) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw createHttpError(400, "Invalid productId");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createHttpError(400, "Invalid quantity");
  }

  const productQuery = Product.findById(productId).select("stock price");

  if (session) {
    productQuery.session(session);
  }

  const product = await productQuery;

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw createHttpError(400, "Insufficient stock");
  }

  return product;
};

const getOrCreateCart = async (userId) => {
  let cart = await Order.findOne({ user: userId, status: "CART" }).populate(
    "items.product",
  );

  if (!cart) {
    cart = await Order.create({
      user: userId,
      items: [],
      totalPrice: 0,
      status: "CART",
      paymentStatus: "PENDING",
    });

    cart = await Order.findById(cart._id).populate("items.product");
  }

  return cart;
};

const addToCart = async (userId, productId, quantity) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createHttpError(400, "Invalid quantity");
  }

  const product = await validateStock(productId, quantity);
  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find((item) => {
    const itemProductId = item.product._id || item.product;
    return String(itemProductId) === String(productId);
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    await validateStock(productId, newQuantity);
    existingItem.quantity = newQuantity;
    existingItem.price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      price: product.price,
    });
  }

  calculateTotalPrice(cart);
  await cart.save();

  return Order.findById(cart._id).populate("items.product");
};

const updateCartItem = async (userId, itemId, quantity) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw createHttpError(400, "Invalid itemId");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createHttpError(400, "Invalid quantity");
  }

  const cart = await Order.findOne({ user: userId, status: "CART" });

  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw createHttpError(404, "Cart item not found");
  }

  const product = await validateStock(item.product, quantity);

  item.quantity = quantity;
  item.price = product.price;

  calculateTotalPrice(cart);
  await cart.save();

  return Order.findById(cart._id).populate("items.product");
};

const removeCartItem = async (userId, itemId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw createHttpError(400, "Invalid itemId");
  }

  const cart = await Order.findOne({ user: userId, status: "CART" });

  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw createHttpError(404, "Cart item not found");
  }

  item.deleteOne();
  calculateTotalPrice(cart);
  await cart.save();

  return Order.findById(cart._id).populate("items.product");
};

const checkoutOrder = async (userId, paymentMethod) => {
  if (!["PAYHERE", "MANUAL"].includes(paymentMethod)) {
    throw createHttpError(400, "Invalid payment method");
  }

  const cart = await Order.findOne({ user: userId, status: "CART" });

  if (!cart) {
    throw createHttpError(404, "Cart not found");
  }

  if (!cart.items.length) {
    throw createHttpError(400, "Cart is empty");
  }

  for (const item of cart.items) {
    await validateStock(item.product, item.quantity);
  }

  if (paymentMethod === "MANUAL") {
    cart.paymentMethod = "MANUAL";
    cart.paymentStatus = "PENDING";
    cart.status = "PENDING_PAYMENT";
    await cart.save();

    return Order.findById(cart._id).populate("items.product");
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    for (const item of cart.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session },
      );

      if (!updatedProduct) {
        throw createHttpError(400, "Insufficient stock");
      }
    }

    await updatePurchaseCounts(cart.items, 1, session);

    cart.paymentMethod = "PAYHERE";
    cart.paymentStatus = "PAID";
    cart.status = "PAID";
    await cart.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
  return Order.findById(cart._id).populate("items.product");
};

const getUserOrders = async (userId) => {
  return Order.find({ user: userId, status: { $ne: "CART" } })
    .populate("items.product")
    .sort({ createdAt: -1 });
};

const getAllOrders = async (filters = {}) => {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.user && mongoose.Types.ObjectId.isValid(filters.user)) {
    query.user = filters.user;
  }

  return Order.find(query)
    .populate("user", "name email role")
    .populate("items.product")
    .sort({ createdAt: -1 });
};

const updateOrderStatus = async (orderId, status) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw createHttpError(400, "Invalid order id");
  }

  const allowedStatuses = [
    "CART",
    "PENDING_PAYMENT",
    "PAID",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  if (!allowedStatuses.includes(status)) {
    throw createHttpError(400, "Invalid order status");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (order.status === "CART") {
    throw createHttpError(400, "Cart status cannot be updated by admin");
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    if (
      status === "PAID" &&
      order.paymentMethod === "MANUAL" &&
      order.paymentStatus !== "PAID"
    ) {
      for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session },
        );

        if (!updatedProduct) {
          throw createHttpError(400, "Insufficient stock");
        }
      }

      await updatePurchaseCounts(order.items, 1, session);

      order.paymentStatus = "PAID";
    }

    const wasPaidOrder = ["PAID", "SHIPPED", "DELIVERED"].includes(
      order.status,
    );

    if (status === "CANCELLED" && wasPaidOrder) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session },
        );
      }

      await updatePurchaseCounts(order.items, -1, session);

      order.paymentStatus = "FAILED";
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return Order.findById(order._id)
    .populate("user", "name email role")
    .populate("items.product");
};

module.exports = {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  calculateTotalPrice,
  validateStock,
  checkoutOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
};
