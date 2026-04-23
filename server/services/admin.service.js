const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const AdminSettings = require("../models/AdminSettings");
const Category = require("../models/Category");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const DEFAULT_SETTINGS = [
  { key: "monthlyTarget", value: 500000 },
  { key: "lowStockThreshold", value: 10 },
  { key: "freeDeliveryThreshold", value: 5000 },
  { key: "deliveryFee", value: 350 },
  { key: "storeName", value: "Smart Fit" },
  { key: "storeTagline", value: "Premium Menswear" },
];

const seedAdminSettings = async () => {
  for (const setting of DEFAULT_SETTINGS) {
    await AdminSettings.updateOne(
      { key: setting.key },
      { $setOnInsert: { value: setting.value } },
      { upsert: true },
    );
  }
};

const getSettingValue = async (key, fallback = null) => {
  const doc = await AdminSettings.findOne({ key }).lean();
  return doc ? doc.value : fallback;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const buildPaidOrderMatch = () => ({
  $or: [
    { paymentStatus: "PAID" },
    { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] } },
  ],
});

const getTotalSales = async () => {
  const [result] = await Order.aggregate([
    { $match: buildPaidOrderMatch() },
    { $group: { _id: null, totalSales: { $sum: "$totalPrice" } } },
  ]);
  return Number((result?.totalSales || 0).toFixed(2));
};

const getTotalOrders = async () =>
  Order.countDocuments({ status: { $ne: "CART" } });

const getTotalVisitors = async () => User.countDocuments({ role: "customer" });

const getTopCategories = async (limit = 5) => {
  const topCategories = await Order.aggregate([
    { $match: buildPaidOrderMatch() },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { unitsSold: -1, revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        category: "$_id",
        unitsSold: 1,
        revenue: { $round: ["$revenue", 2] },
      },
    },
  ]);
  return topCategories;
};

const getRevenueAnalytics = async (range = 7) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const currentStartDate = new Date(today);
  currentStartDate.setUTCDate(today.getUTCDate() - (range - 1));

  const previousStartDate = new Date(currentStartDate);
  previousStartDate.setUTCDate(currentStartDate.getUTCDate() - range);

  const paidMatch = buildPaidOrderMatch();

  const [dailyRevenue, currentPeriodData, previousPeriodData] = await Promise.all([
    Order.aggregate([
      { $match: { ...paidMatch, createdAt: { $gte: currentStartDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { ...paidMatch, createdAt: { $gte: currentStartDate } } },
      { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...paidMatch, createdAt: { $gte: previousStartDate, $lt: currentStartDate } } },
      { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
    ]),
  ]);

  const indexedDaily = new Map(dailyRevenue.map((entry) => [entry._id, entry]));
  const trend = Array.from({ length: range }, (_item, index) => {
    const day = new Date(currentStartDate);
    day.setUTCDate(currentStartDate.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    const found = indexedDaily.get(date);
    return { date, revenue: Number((found?.revenue || 0).toFixed(2)), orders: found?.orders || 0 };
  });

  const currentRevenue = Number((currentPeriodData[0]?.revenue || 0).toFixed(2));
  const previousRevenue = Number((previousPeriodData[0]?.revenue || 0).toFixed(2));
  const changePercent =
    previousRevenue === 0
      ? currentRevenue > 0 ? 100 : 0
      : Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2));

  return {
    range,
    daily: trend,
    currentPeriodRevenue: currentRevenue,
    previousPeriodRevenue: previousRevenue,
    currentPeriodOrders: currentPeriodData[0]?.orders || 0,
    previousPeriodOrders: previousPeriodData[0]?.orders || 0,
    revenueChangePercent: changePercent,
  };
};

const getConversionMetrics = async () => {
  const [viewResult, cartResult, checkoutCount, paidOrders] = await Promise.all([
    Product.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
    Order.aggregate([
      { $match: { status: { $ne: "CART" } } },
      { $unwind: "$items" },
      { $group: { _id: null, cartAdds: { $sum: "$items.quantity" } } },
    ]),
    Order.countDocuments({
      status: { $in: ["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] },
    }),
    Order.countDocuments(buildPaidOrderMatch()),
  ]);

  const views = viewResult[0]?.views || 0;
  const cartAdds = cartResult[0]?.cartAdds || 0;
  const toPercent = (n, d) => (!d ? 0 : Number(((n / d) * 100).toFixed(2)));

  return {
    productViews: views,
    cartAdds,
    checkouts: checkoutCount,
    paidOrders,
    rates: {
      viewsToCart: toPercent(cartAdds, views),
      cartToCheckout: toPercent(checkoutCount, cartAdds),
      checkoutToPaid: toPercent(paidOrders, checkoutCount),
      viewsToPaid: toPercent(paidOrders, views),
    },
  };
};

const getLowStockProducts = async (threshold = 10) => {
  return Product.find({ stock: { $lt: threshold }, status: { $ne: "deleted" } })
    .select("name category stock price views purchases")
    .sort({ stock: 1, updatedAt: -1 })
    .limit(25)
    .lean();
};

const getTrendingProducts = async (limit = 5) => {
  return Product.aggregate([
    { $match: { status: { $ne: "deleted" } } },
    { $addFields: { score: { $add: ["$views", { $multiply: ["$purchases", 2] }] } } },
    { $sort: { score: -1, purchases: -1, views: -1 } },
    { $limit: limit },
    { $project: { _id: 1, name: 1, category: 1, stock: 1, views: 1, purchases: 1, score: 1 } },
  ]);
};

const getDashboardMetrics = async ({ range = 7, categoryLimit = 5, trendingLimit = 5, threshold } = {}) => {
  const stockThreshold = threshold || (await getSettingValue("lowStockThreshold", 10));
  const monthlyTarget = await getSettingValue("monthlyTarget", 500000);

  const [totalSales, totalOrders, totalVisitors, topCategories, revenueAnalytics, conversionMetrics, lowStockProducts, trendingProducts] =
    await Promise.all([
      getTotalSales(),
      getTotalOrders(),
      getTotalVisitors(),
      getTopCategories(categoryLimit),
      getRevenueAnalytics(range),
      getConversionMetrics(),
      getLowStockProducts(stockThreshold),
      getTrendingProducts(trendingLimit),
    ]);

  return {
    totalSales,
    totalOrders,
    totalVisitors,
    topCategories,
    revenueAnalytics,
    conversionMetrics,
    lowStockProducts,
    trendingProducts,
    monthlyTarget,
    lowStockThreshold: stockThreshold,
  };
};

// ─── Orders ───────────────────────────────────────────────────────────────────

const getAdminOrders = async ({ page = 1, limit = 20, status, paymentStatus, paymentMethod, search, dateFrom, dateTo } = {}) => {
  const query = { status: { $ne: "CART" } };

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const trimmed = search.trim();
    const searchRegex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchedUsers = await User.find({ name: searchRegex }).select("_id").lean();
    const userIds = matchedUsers.map((u) => u._id);

    const orClauses = [{ user: { $in: userIds } }];

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      orClauses.push({ _id: new mongoose.Types.ObjectId(trimmed) });
    }

    // Allow partial match on last N chars of the order ID (as shown in the UI)
    if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length <= 24) {
      orClauses.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: trimmed,
            options: "i",
          },
        },
      });
    }

    query.$or = orClauses;
  }

  const skip = (Math.max(page, 1) - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "name images category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  return { orders, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getAdminOrderById = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw createHttpError(400, "Invalid order id");

  const order = await Order.findOne({ _id: orderId, status: { $ne: "CART" } })
    .populate("user", "name email phone")
    .populate("items.product", "name images category price")
    .lean();

  if (!order) throw createHttpError(404, "Order not found");
  return order;
};

const getPendingBankOrders = async ({ page = 1, limit = 20, search } = {}) => {
  const query = { paymentMethod: "MANUAL", paymentStatus: "PENDING", status: { $ne: "CART" } };

  if (search) {
    const trimmed = search.trim();
    const searchRegex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchedUsers = await User.find({ name: searchRegex }).select("_id").lean();
    const userIds = matchedUsers.map((u) => u._id);

    const orClauses = [{ user: { $in: userIds } }];

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      orClauses.push({ _id: new mongoose.Types.ObjectId(trimmed) });
    }

    if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length <= 24) {
      orClauses.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: trimmed,
            options: "i",
          },
        },
      });
    }

    query.$or = orClauses;
  }

  const skip = (Math.max(page, 1) - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "name images price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  return { orders, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const approveBankPayment = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw createHttpError(400, "Invalid order id");
  const order = await Order.findById(orderId).populate("items.product");
  if (!order) throw createHttpError(404, "Order not found");
  if (order.paymentMethod !== "MANUAL") throw createHttpError(400, "Not a bank transfer order");
  if (order.paymentStatus === "PAID") return order;

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    for (const item of order.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session },
      );
      if (!updated) throw createHttpError(400, "Insufficient stock");
    }

    order.paymentStatus = "PAID";
    order.status = "PAID";
    order.paymentVerifiedAt = new Date();
    await order.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  return Order.findById(order._id).populate("user", "name email").populate("items.product");
};

const rejectBankPayment = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) throw createHttpError(400, "Invalid order id");
  const order = await Order.findById(orderId);
  if (!order) throw createHttpError(404, "Order not found");
  if (order.paymentMethod !== "MANUAL") throw createHttpError(400, "Not a bank transfer order");

  order.paymentStatus = "FAILED";
  order.status = "CANCELLED";
  order.paymentVerifiedAt = new Date();
  await order.save();
  return order;
};

// ─── Customers ────────────────────────────────────────────────────────────────

const getAdminCustomers = async ({ page = 1, limit = 20, search, status, hasOrders } = {}) => {
  const query = { role: "customer" };

  if (status === "banned") query.isBanned = true;
  else if (status === "active") query.isBanned = { $ne: true };

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const skip = (Math.max(page, 1) - 1) * limit;

  const [customers, total] = await Promise.all([
    User.find(query)
      .select("name email phone createdAt isBanned avatar lastLogin")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  const customerIds = customers.map((c) => c._id);
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: customerIds }, status: { $ne: "CART" } } },
    {
      $group: {
        _id: "$user",
        totalOrders: { $sum: 1 },
        totalSpent: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  { $in: ["$status", ["PAID", "SHIPPED", "DELIVERED"]] },
                ],
              },
              "$totalPrice",
              0,
            ],
          },
        },
      },
    },
  ]);

  const statsMap = new Map(orderStats.map((s) => [String(s._id), s]));
  const enriched = customers.map((c) => {
    const stats = statsMap.get(String(c._id)) || { totalOrders: 0, totalSpent: 0 };
    return { ...c, totalOrders: stats.totalOrders, totalSpent: Number(stats.totalSpent.toFixed(2)) };
  });

  if (hasOrders === "yes") {
    const withOrders = enriched.filter((c) => c.totalOrders > 0);
    return { customers: withOrders, total: withOrders.length, page: Number(page), pages: 1 };
  }
  if (hasOrders === "no") {
    const noOrders = enriched.filter((c) => c.totalOrders === 0);
    return { customers: noOrders, total: noOrders.length, page: Number(page), pages: 1 };
  }

  return { customers: enriched, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const getAdminCustomerById = async (customerId) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) throw createHttpError(400, "Invalid customer id");

  const customer = await User.findById(customerId)
    .select("name email phone createdAt isBanned avatar lastLogin wishlist")
    .lean();

  if (!customer || customer.role === "admin") throw createHttpError(404, "Customer not found");

  const orders = await Order.find({ user: customerId, status: { $ne: "CART" } })
    .populate("items.product", "name")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const totalSpent = orders
    .filter((o) => o.paymentStatus === "PAID" || ["PAID", "SHIPPED", "DELIVERED"].includes(o.status))
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  return {
    ...customer,
    orders,
    totalOrders: orders.length,
    totalSpent: Number(totalSpent.toFixed(2)),
    wishlistCount: customer.wishlist?.length || 0,
  };
};

const toggleCustomerBan = async (customerId, isBanned) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) throw createHttpError(400, "Invalid customer id");

  const customer = await User.findOne({ _id: customerId, role: "customer" });
  if (!customer) throw createHttpError(404, "Customer not found");

  customer.isBanned = Boolean(isBanned);
  await customer.save();
  return { _id: customer._id, isBanned: customer.isBanned };
};

// ─── Admin Profile ────────────────────────────────────────────────────────────

const getAdminProfile = async (adminId) => {
  const admin = await User.findOne({ _id: adminId, role: "admin" })
    .select("name email phone avatar createdAt lastLogin role")
    .lean();
  if (!admin) throw createHttpError(404, "Admin not found");
  return admin;
};

const updateAdminProfile = async (adminId, { name, phone }) => {
  const admin = await User.findOne({ _id: adminId, role: "admin" });
  if (!admin) throw createHttpError(404, "Admin not found");
  if (name !== undefined) admin.name = String(name).trim();
  if (phone !== undefined) admin.phone = String(phone).trim();
  await admin.save();
  return admin.toObject();
};

const changeAdminPassword = async (adminId, { currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw createHttpError(400, "All password fields are required");
  }
  if (newPassword !== confirmPassword) {
    throw createHttpError(400, "New passwords do not match");
  }
  if (newPassword.length < 6) {
    throw createHttpError(400, "Password must be at least 6 characters");
  }

  const admin = await User.findOne({ _id: adminId, role: "admin" });
  if (!admin) throw createHttpError(404, "Admin not found");

  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) throw createHttpError(400, "Current password is incorrect");

  admin.password = newPassword;
  await admin.save();
};

// ─── Settings ─────────────────────────────────────────────────────────────────

const getAllSettings = async () => {
  await seedAdminSettings();
  const settings = await AdminSettings.find().lean();
  return settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
};

const updateSettings = async (updates) => {
  const ops = Object.entries(updates).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $set: { value } },
      upsert: true,
    },
  }));
  if (ops.length) await AdminSettings.bulkWrite(ops);
  return getAllSettings();
};

// ─── Categories ───────────────────────────────────────────────────────────────

const getCategories = async () => Category.find().sort({ name: 1 }).lean();

const createCategory = async (name) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw createHttpError(400, "Category name is required");
  const existing = await Category.findOne({ name: new RegExp(`^${trimmed}$`, "i") });
  if (existing) throw createHttpError(400, "Category already exists");
  return Category.create({ name: trimmed });
};

const updateCategory = async (id, name) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, "Invalid category id");
  const trimmed = String(name || "").trim();
  if (!trimmed) throw createHttpError(400, "Category name is required");
  const category = await Category.findById(id);
  if (!category) throw createHttpError(404, "Category not found");
  category.name = trimmed;
  await category.save();
  return category;
};

const deleteCategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, "Invalid category id");
  const category = await Category.findById(id);
  if (!category) throw createHttpError(404, "Category not found");

  const activeCount = await Product.countDocuments({ category: category.name, status: { $in: ["active", "inactive"] } });
  if (activeCount > 0) throw createHttpError(400, `Cannot delete — ${activeCount} product(s) use this category`);

  await category.deleteOne();
};

// ─── Products (admin) ─────────────────────────────────────────────────────────

const updateProductStatus = async (id, status) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, "Invalid product id");
  if (!["active", "inactive"].includes(status)) throw createHttpError(400, "Status must be active or inactive");
  const product = await Product.findOneAndUpdate(
    { _id: id, status: { $ne: "deleted" } },
    { status },
    { new: true },
  );
  if (!product) throw createHttpError(404, "Product not found");
  return product;
};

const getAdminProducts = async ({ page = 1, limit = 20, search, category, stockStatus, status, priceMin, priceMax, sortBy = "createdAt", sortDir = "desc" } = {}) => {
  const query = { status: { $ne: "deleted" } };

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: re }, { category: re }];
  }
  if (category) query.category = category;
  if (status === "active" || status === "inactive") query.status = status;
  if (stockStatus === "inStock") query.stock = { $gt: 0 };
  if (stockStatus === "outOfStock") query.stock = { $lte: 0 };
  if (priceMin !== undefined || priceMax !== undefined) {
    query.price = {};
    if (priceMin !== undefined) query.price.$gte = Number(priceMin);
    if (priceMax !== undefined) query.price.$lte = Number(priceMax);
  }

  const allowed = ["name", "price", "stock", "createdAt"];
  const sortField = allowed.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = sortDir === "asc" ? 1 : -1;

  const skip = (Math.max(page, 1) - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  return { products, total, page: Number(page), pages: Math.ceil(total / limit) };
};

const BULK_FIT_ENUM = ["Slim", "Regular", "Relaxed", "Oversized"];
const BULK_STYLE_ENUM = ["Classic", "Streetwear", "Smart Casual", "Minimalist"];
const BULK_OCCASION_ENUM = ["Casual", "Formal", "Night Out", "Active"];
const BULK_COLOR_FAMILY_ENUM = ["Neutrals", "Earth Tones", "Bold & Bright", "Navy & Blues"];

const bulkCreateProducts = async (rows) => {
  if (!Array.isArray(rows) || !rows.length) throw createHttpError(400, "No products provided");

  const results = { created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.name || !row.category || row.price === undefined) {
        throw new Error("Missing required fields: name, category, price");
      }
      const primaryImage = row.primaryImage ? String(row.primaryImage).trim() : "";
      const secondaryImages = Array.isArray(row.secondaryImages)
        ? row.secondaryImages.filter(Boolean)
        : [];
      const allImages = [primaryImage, ...secondaryImages].filter(Boolean);

      const productData = {
        name: String(row.name).trim(),
        category: String(row.category).trim(),
        description: row.description ? String(row.description).trim() : "",
        price: Number(row.price),
        stock: Number(row.stock || 0),
        sizes: row.sizes ? String(row.sizes).split(",").map((s) => s.trim()).filter(Boolean) : [],
        status: row.status === "inactive" ? "inactive" : "active",
        primaryImage,
        secondaryImages,
        images: allImages,
      };

      if (row.fit && BULK_FIT_ENUM.includes(row.fit)) productData.fit = row.fit;
      if (row.style && BULK_STYLE_ENUM.includes(row.style)) productData.style = row.style;
      if (row.occasion && BULK_OCCASION_ENUM.includes(row.occasion)) productData.occasion = row.occasion;
      if (row.colorFamily && BULK_COLOR_FAMILY_ENUM.includes(row.colorFamily)) productData.colorFamily = row.colorFamily;

      await Product.create(productData);
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, message: err.message });
    }
  }

  return results;
};

const softDeleteProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, "Invalid product id");
  const product = await Product.findById(id);
  if (!product) throw createHttpError(404, "Product not found");
  product.status = "deleted";
  await product.save();
};

// ─── Dashboard v2 Cards ───────────────────────────────────────────────────────

const UserActivity = require("../models/UserActivity");

const calcChange = (cur, prev) => {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Number((((cur - prev) / prev) * 100).toFixed(1));
};

const getWeeklyStats = async () => {
  const now = new Date();
  const day7Start = new Date(now);
  day7Start.setUTCDate(now.getUTCDate() - 7);
  day7Start.setUTCHours(0, 0, 0, 0);

  const day14Start = new Date(now);
  day14Start.setUTCDate(now.getUTCDate() - 14);
  day14Start.setUTCHours(0, 0, 0, 0);

  const paidMatch = buildPaidOrderMatch();

  const [curSales, prevSales, curOrders, prevOrders, curCusts, prevCusts] =
    await Promise.all([
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: day7Start } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: day14Start, $lt: day7Start } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.countDocuments({ status: { $ne: "CART" }, createdAt: { $gte: day7Start } }),
      Order.countDocuments({ status: { $ne: "CART" }, createdAt: { $gte: day14Start, $lt: day7Start } }),
      User.countDocuments({ role: "customer", createdAt: { $gte: day7Start } }),
      User.countDocuments({ role: "customer", createdAt: { $gte: day14Start, $lt: day7Start } }),
    ]);

  const curSalesVal = Number((curSales[0]?.total || 0).toFixed(2));
  const prevSalesVal = Number((prevSales[0]?.total || 0).toFixed(2));

  return {
    sales: { current: curSalesVal, previous: prevSalesVal, change: calcChange(curSalesVal, prevSalesVal) },
    orders: { current: curOrders, previous: prevOrders, change: calcChange(curOrders, prevOrders) },
    customers: { current: curCusts, previous: prevCusts, change: calcChange(curCusts, prevCusts) },
  };
};

const getRevenueChartData = async ({ range = 7, dateFrom, dateTo } = {}) => {
  let startDate, endDate;
  endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  if (dateFrom && dateTo) {
    startDate = new Date(dateFrom);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(dateTo);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    const days = Number(range) || 7;
    startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);
  }

  const paidMatch = buildPaidOrderMatch();

  const daily = await Order.aggregate([
    { $match: { ...paidMatch, createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const indexedDaily = new Map(daily.map((d) => [d._id, d]));
  const days = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10);
    const found = indexedDaily.get(key);
    days.push({
      date: key,
      revenue: Number((found?.revenue || 0).toFixed(2)),
      orders: found?.orders || 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return days;
};

const getTopCategoriesDonut = async (limit = 8) => {
  const paidMatch = buildPaidOrderMatch();
  const results = await Order.aggregate([
    { $match: paidMatch },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        value: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { value: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: "$_id",
        value: { $round: ["$value", 2] },
      },
    },
  ]);
  return results;
};

const getMonthlyTargetData = async () => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const paidMatch = buildPaidOrderMatch();
  const [result, target] = await Promise.all([
    Order.aggregate([
      { $match: { ...paidMatch, createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    getSettingValue("monthlyTarget", 500000),
  ]);

  const revenue = Number((result[0]?.total || 0).toFixed(2));
  const targetNum = Number(target) || 500000;
  const percent = targetNum > 0 ? Math.min(Number(((revenue / targetNum) * 100).toFixed(1)), 100) : 0;

  return { revenue, target: targetNum, percent };
};

const getConversionFunnelData = async () => {
  const paidMatch = buildPaidOrderMatch();
  const [views, cartAdds, checkouts, paid] = await Promise.all([
    UserActivity.countDocuments({ eventType: "view" }),
    UserActivity.countDocuments({ eventType: "cart_add" }),
    Order.countDocuments({
      status: { $in: ["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] },
    }),
    Order.countDocuments(paidMatch),
  ]);

  // Cap each stage at the previous to guarantee a monotonically decreasing funnel
  const cappedCartAdds = Math.min(cartAdds, views);
  const cappedCheckouts = Math.min(checkouts, cappedCartAdds);
  const cappedPaid = Math.min(paid, cappedCheckouts);
  const cappedAbandoned = Math.max(0, cappedCartAdds - cappedPaid);
  const toRate = (n, d) => (d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0);

  return [
    { stage: "Product Views", count: views, rate: 100, fromPrev: null },
    { stage: "Add to Cart", count: cappedCartAdds, rate: toRate(cappedCartAdds, views), fromPrev: toRate(cappedCartAdds, views) },
    { stage: "Checkout", count: cappedCheckouts, rate: toRate(cappedCheckouts, views), fromPrev: toRate(cappedCheckouts, cappedCartAdds) },
    { stage: "Purchases", count: cappedPaid, rate: toRate(cappedPaid, views), fromPrev: toRate(cappedPaid, cappedCheckouts) },
    { stage: "Abandoned", count: cappedAbandoned, rate: toRate(cappedAbandoned, views), fromPrev: toRate(cappedAbandoned, cappedCartAdds) },
  ];
};

const getTopProductsDashboard = async (limit = 5) => {
  const cappedLimit = Math.min(Number(limit), 20);
  const result = await Order.aggregate([
    { $match: { paymentStatus: "PAID" } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", unitsSold: { $sum: "$items.quantity" } } },
    { $sort: { unitsSold: -1 } },
    { $limit: cappedLimit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.status": { $ne: "deleted" } } },
    {
      $project: {
        _id: "$product._id",
        name: "$product.name",
        category: "$product.category",
        primaryImage: "$product.primaryImage",
        images: "$product.images",
        views: "$product.views",
        purchases: "$unitsSold",
      },
    },
  ]);
  return result;
};

const getLowStockDashboard = async () => {
  const threshold = await getSettingValue("lowStockThreshold", 10);
  const products = await Product.find({
    stock: { $lte: Number(threshold) },
    status: { $ne: "deleted" },
  })
    .select("name category stock images _id")
    .sort({ stock: 1 })
    .limit(30)
    .lean();
  return { products, threshold: Number(threshold) };
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const buildDateRange = ({ dateFrom, dateTo, rangeDays } = {}) => {
  let start, end;
  end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  if (dateFrom && dateTo) {
    start = new Date(dateFrom);
    start.setUTCHours(0, 0, 0, 0);
    end = new Date(dateTo);
    end.setUTCHours(23, 59, 59, 999);
  } else {
    const days = Number(rangeDays) || 30;
    start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
  }
  return { start, end };
};

const buildPrevRange = (start, end) => {
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms);
  return { prevStart, prevEnd };
};

// 1. Sales Summary
const getReportSalesSummary = async ({ dateFrom, dateTo, rangeDays, categories } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });
  const { prevStart, prevEnd } = buildPrevRange(start, end);

  const baseMatch = { status: { $nin: ["CART"] } };
  const catFilter = categories && categories.length ? { "product.category": { $in: categories } } : null;

  // If category filter, we need to join items
  const buildPipeline = (dateStart, dateEnd) => {
    const pipeline = [
      { $match: { ...baseMatch, createdAt: { $gte: dateStart, $lte: dateEnd } } },
    ];
    if (catFilter) {
      pipeline.push(
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
        { $unwind: "$product" },
        { $match: catFilter },
        { $group: { _id: "$_id", totalPrice: { $first: "$totalPrice" }, status: { $first: "$status" } } },
      );
    }
    return pipeline;
  };

  const paidMatch = { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID" };

  const [curRevRaw, prevRevRaw, curOrders, prevOrders, curCancelled, prevCancelled] = await Promise.all([
    Order.aggregate([...buildPipeline(start, end), { $match: paidMatch }, { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }]),
    Order.aggregate([...buildPipeline(prevStart, prevEnd), { $match: paidMatch }, { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }]),
    Order.countDocuments({ ...baseMatch, createdAt: { $gte: start, $lte: end } }),
    Order.countDocuments({ ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd } }),
    Order.countDocuments({ status: "CANCELLED", createdAt: { $gte: start, $lte: end } }),
    Order.countDocuments({ status: "CANCELLED", createdAt: { $gte: prevStart, $lte: prevEnd } }),
  ]);

  const curRev = curRevRaw[0]?.total || 0;
  const prevRev = prevRevRaw[0]?.total || 0;
  const curOrdCount = curRevRaw[0]?.count || 0;
  const prevOrdCount = prevRevRaw[0]?.count || 0;
  const curAov = curOrdCount > 0 ? curRev / curOrdCount : 0;
  const prevAov = prevOrdCount > 0 ? prevRev / prevOrdCount : 0;

  return {
    totalRevenue: { current: Number(curRev.toFixed(2)), previous: Number(prevRev.toFixed(2)), change: calcChange(curRev, prevRev) },
    totalOrders: { current: curOrders, previous: prevOrders, change: calcChange(curOrders, prevOrders) },
    avgOrderValue: { current: Number(curAov.toFixed(2)), previous: Number(prevAov.toFixed(2)), change: calcChange(curAov, prevAov) },
    cancelled: { current: curCancelled, previous: prevCancelled, change: calcChange(curCancelled, prevCancelled) },
  };
};

// 2. Revenue Breakdown (daily time series + table)
const getReportRevenueBreakdown = async ({ dateFrom, dateTo, rangeDays, categories } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });
  const paidMatch = { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID", createdAt: { $gte: start, $lte: end } };

  let pipeline;
  if (categories && categories.length) {
    pipeline = [
      { $match: paidMatch },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.category": { $in: categories } } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, orderId: "$_id" }, totalPrice: { $first: "$totalPrice" } } },
      { $group: { _id: "$_id.date", revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];
  } else {
    pipeline = [
      { $match: paidMatch },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];
  }

  const daily = await Order.aggregate(pipeline);
  const indexed = new Map(daily.map((d) => [d._id, d]));
  const rows = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    const found = indexed.get(key);
    const rev = Number((found?.revenue || 0).toFixed(2));
    const ord = found?.orders || 0;
    rows.push({ date: key, orders: ord, revenue: rev, avgOrderValue: ord > 0 ? Number((rev / ord).toFixed(2)) : 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return rows;
};

// 3. Top Performing Products
const getReportTopProducts = async ({ dateFrom, dateTo, rangeDays, categories, limit = 20 } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });
  const paidMatch = { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID", createdAt: { $gte: start, $lte: end } };

  const pipeline = [
    { $match: paidMatch },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
  ];

  if (categories && categories.length) {
    pipeline.push({ $match: { "product.category": { $in: categories } } });
  }

  pipeline.push(
    {
      $group: {
        _id: "$product._id",
        name: { $first: "$product.name" },
        category: { $first: "$product.category" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: Math.min(Number(limit), 50) },
    { $project: { _id: 0, name: 1, category: 1, unitsSold: 1, revenue: { $round: ["$revenue", 2] } } },
  );

  const results = await Order.aggregate(pipeline);
  return results.map((r, i) => ({ rank: i + 1, ...r }));
};

// 4. Category Performance
const getReportCategoryPerformance = async ({ dateFrom, dateTo, rangeDays } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });
  const paidMatch = { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID", createdAt: { $gte: start, $lte: end } };

  const [catRevenue, catProductCounts] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Product.aggregate([
      { $match: { status: { $ne: "deleted" } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const productCountMap = new Map(catProductCounts.map((c) => [c._id, c.count]));
  const totalRevenue = catRevenue.reduce((s, c) => s + c.revenue, 0);

  return catRevenue.map((c) => ({
    name: c._id || "Uncategorized",
    productCount: productCountMap.get(c._id) || 0,
    unitsSold: c.unitsSold,
    revenue: Number(c.revenue.toFixed(2)),
    pctOfTotal: totalRevenue > 0 ? Number(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0,
  }));
};

// 5. Order Status Breakdown
const getReportOrderStatusBreakdown = async ({ dateFrom, dateTo, rangeDays } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });
  const statuses = ["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];

  const counts = await Order.aggregate([
    { $match: { status: { $in: statuses }, createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  const total = Array.from(countMap.values()).reduce((s, v) => s + v, 0);

  const LABELS = {
    PENDING_PAYMENT: "Pending Payment",
    PAID: "Paid",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  return statuses.map((s) => {
    const count = countMap.get(s) || 0;
    return { status: s, label: LABELS[s], count, pct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0 };
  });
};

// 6. Customer Insights
const getReportCustomerInsights = async ({ dateFrom, dateTo, rangeDays } = {}) => {
  const { start, end } = buildDateRange({ dateFrom, dateTo, rangeDays });

  const [newCustomers, returningRaw, topSpenders] = await Promise.all([
    User.countDocuments({ role: "customer", createdAt: { $gte: start, $lte: end } }),
    Order.aggregate([
      { $match: { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID" } },
      { $group: { _id: "$user", orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: "count" },
    ]),
    Order.aggregate([
      { $match: { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] }, paymentStatus: "PAID", createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$user", totalSpent: { $sum: "$totalPrice" }, orderCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { _id: 0, name: "$user.name", email: "$user.email", orderCount: 1, totalSpent: { $round: ["$totalSpent", 2] } } },
    ]),
  ]);

  return {
    newCustomers,
    returningCustomers: returningRaw[0]?.count || 0,
    topSpenders,
  };
};

// 7. Low Stock Snapshot
const getReportLowStockSnapshot = async () => {
  const threshold = await getSettingValue("lowStockThreshold", 10);
  const products = await Product.find({
    stock: { $lte: Number(threshold) },
    status: { $ne: "deleted" },
  })
    .select("name category stock")
    .sort({ stock: 1 })
    .lean();
  return { products, threshold: Number(threshold), asOf: new Date().toISOString() };
};

module.exports = {
  seedAdminSettings,
  getSettingValue,
  getDashboardMetrics,
  getTotalSales,
  getTotalOrders,
  getTotalVisitors,
  getTopCategories,
  getRevenueAnalytics,
  getConversionMetrics,
  getLowStockProducts,
  getTrendingProducts,
  getAdminOrders,
  getAdminOrderById,
  getPendingBankOrders,
  approveBankPayment,
  rejectBankPayment,
  getAdminCustomers,
  getAdminCustomerById,
  toggleCustomerBan,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllSettings,
  updateSettings,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateProductStatus,
  getAdminProducts,
  bulkCreateProducts,
  softDeleteProduct,
  getWeeklyStats,
  getRevenueChartData,
  getTopCategoriesDonut,
  getMonthlyTargetData,
  getConversionFunnelData,
  getTopProductsDashboard,
  getLowStockDashboard,
  // Reports
  getReportSalesSummary,
  getReportRevenueBreakdown,
  getReportTopProducts,
  getReportCategoryPerformance,
  getReportOrderStatusBreakdown,
  getReportCustomerInsights,
  getReportLowStockSnapshot,
};
