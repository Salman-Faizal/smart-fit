const orderService = require("../services/order.service");
const User = require("../models/User");
const {
  sendEmail,
  orderRejectionEmail,
  orderCancellationEmail,
} = require("../services/email.service");

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

exports.clearCartItems = async (req, res) => {
  try {
    await orderService.clearCart(req.user.id);
    return res.status(200).json({ message: "Cart cleared" });
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

    // Capture previous state before update for email logic
    const Order = require("../models/Order");
    const prevOrder = await Order.findById(id).select("status paymentMethod paymentStatus user");

    const order = await orderService.updateOrderStatus(id, status);

    // Bank payment rejection: MANUAL order cancelled while still PENDING (never paid)
    if (
      status === "CANCELLED" &&
      prevOrder?.paymentMethod === "MANUAL" &&
      prevOrder?.paymentStatus !== "PAID"
    ) {
      const userDoc = order.user;
      const userName = userDoc?.name || "Customer";
      const userEmail = userDoc?.email;
      if (userEmail) {
        sendEmail(
          userEmail,
          `Update on your Smart Fit order #${String(order._id).slice(-8).toUpperCase()}`,
          orderRejectionEmail(userName, order),
        ).catch(() => {});
      }
    }

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

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.cancelOrder(req.user.id, orderId);

    const user = await User.findById(req.user.id).select("name email");
    if (user) {
      sendEmail(
        user.email,
        `Your order #${String(order._id).slice(-8).toUpperCase()} has been cancelled`,
        orderCancellationEmail(user.name, order),
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Order cancelled", order });
  } catch (error) {
    return handleError(res, error);
  }
};
