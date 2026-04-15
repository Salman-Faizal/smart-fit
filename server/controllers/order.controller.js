const orderService = require("../services/order.service");

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  return res
    .status(statusCode)
    .json({ message: error.message || "Server error" });
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    const cart = await orderService.addToCart(
      req.user.id,
      productId,
      Number(quantity),
    );

    return res.status(200).json({
      message: "Item added to cart",
      cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = await orderService.getOrCreateCart(req.user.id);
    return res.status(200).json({ cart });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body || {};

    const cart = await orderService.updateCartItem(
      req.user.id,
      itemId,
      Number(quantity),
    );

    return res.status(200).json({
      message: "Cart item updated",
      cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await orderService.removeCartItem(req.user.id, itemId);

    return res.status(200).json({
      message: "Cart item removed",
      cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.checkoutOrder = async (req, res) => {
  try {
    const { paymentMethod } = req.body || {};
    const order = await orderService.checkoutOrder(req.user.id, paymentMethod);

    return res.status(200).json({
      message: "Checkout completed",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getOrdersByUser = async (req, res) => {
  try {
    const orders = await orderService.getUserOrders(req.user.id);
    return res.status(200).json({ orders });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getUserOrderById(req.user.id, orderId);
    return res.status(200).json({ order });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders(req.query);
    return res.status(200).json({ orders });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const order = await orderService.updateOrderStatus(id, status);

    return res.status(200).json({
      message: "Order status updated",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
};


exports.markOrderPaid = async (req, res) => {
  try {
    const order = await orderService.markOrderPaid(req.user.id, req.params.orderId);
    return res.status(200).json({ message: "Order marked as paid", order });
  } catch (error) {
    return handleError(res, error);
  }
};
