const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const paidOrderMatch = {
  $or: [
    { paymentStatus: "PAID" },
    { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] } },
  ],
};

const getTotalSales = async () => {
  const [result] = await Order.aggregate([
    { $match: paidOrderMatch },
    { $group: { _id: null, totalSales: { $sum: "$totalPrice" } } },
  ]);

  return Number((result?.totalSales || 0).toFixed(2));
};

const getTotalOrders = async () =>
  Order.countDocuments({ status: { $ne: "CART" } });

const getTotalVisitors = async () => User.countDocuments({ role: "customer" });

const getTopCategories = async (limit = 5) => {
  const topCategories = await Order.aggregate([
    { $match: paidOrderMatch },
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

  const [dailyRevenue, currentPeriodData, previousPeriodData] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...paidOrderMatch,
            createdAt: { $gte: currentStartDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...paidOrderMatch,
            createdAt: { $gte: currentStartDate },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            ...paidOrderMatch,
            createdAt: { $gte: previousStartDate, $lt: currentStartDate },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
      ]),
    ]);

  const indexedDaily = new Map(dailyRevenue.map((entry) => [entry._id, entry]));

  const trend = Array.from({ length: range }, (_item, index) => {
    const day = new Date(currentStartDate);
    day.setUTCDate(currentStartDate.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    const found = indexedDaily.get(date);

    return {
      date,
      revenue: Number((found?.revenue || 0).toFixed(2)),
      orders: found?.orders || 0,
    };
  });

  const currentRevenue = Number(
    (currentPeriodData[0]?.revenue || 0).toFixed(2),
  );
  const previousRevenue = Number(
    (previousPeriodData[0]?.revenue || 0).toFixed(2),
  );

  const changePercent =
    previousRevenue === 0
      ? currentRevenue > 0
        ? 100
        : 0
      : Number(
          (
            ((currentRevenue - previousRevenue) / previousRevenue) *
            100
          ).toFixed(2),
        );

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
  const [viewResult, cartResult, checkoutCount, paidOrders] = await Promise.all(
    [
      Product.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
      Order.aggregate([
        { $match: { status: { $ne: "CART" } } },
        { $unwind: "$items" },
        { $group: { _id: null, cartAdds: { $sum: "$items.quantity" } } },
      ]),
      Order.countDocuments({
        status: {
          $in: ["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"],
        },
      }),
      Order.countDocuments(paidOrderMatch),
    ],
  );

  const views = viewResult[0]?.views || 0;
  const cartAdds = cartResult[0]?.cartAdds || 0;

  const toPercent = (numerator, denominator) => {
    if (!denominator) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
  };

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

const getLowStockProducts = async (threshold = 5) => {
  return Product.find({ stock: { $lt: threshold } })
    .select("name category stock price views purchases")
    .sort({ stock: 1, updatedAt: -1 })
    .limit(25)
    .lean();
};

const getTrendingProducts = async (limit = 5) => {
  return Product.aggregate([
    {
      $addFields: {
        score: { $add: ["$views", { $multiply: ["$purchases", 2] }] },
      },
    },
    { $sort: { score: -1, purchases: -1, views: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        category: 1,
        stock: 1,
        views: 1,
        purchases: 1,
        score: 1,
      },
    },
  ]);
};

const getDashboardMetrics = async ({
  range = 7,
  categoryLimit = 5,
  trendingLimit = 5,
  threshold = 5,
} = {}) => {
  const [
    totalSales,
    totalOrders,
    totalVisitors,
    topCategories,
    revenueAnalytics,
    conversionMetrics,
    lowStockProducts,
    trendingProducts,
  ] = await Promise.all([
    getTotalSales(),
    getTotalOrders(),
    getTotalVisitors(),
    getTopCategories(categoryLimit),
    getRevenueAnalytics(range),
    getConversionMetrics(),
    getLowStockProducts(threshold),
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
  };
};

module.exports = {
  getTotalSales,
  getTotalOrders,
  getTotalVisitors,
  getTopCategories,
  getRevenueAnalytics,
  getConversionMetrics,
  getLowStockProducts,
  getTrendingProducts,
  getDashboardMetrics,
};
