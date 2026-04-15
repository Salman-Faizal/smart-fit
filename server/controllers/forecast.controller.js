/**
 * forecast.controller.js
 *
 * Handles:
 *   GET  /api/admin/forecast            — per-product forecast data + summary
 *   GET  /api/admin/forecast/sales-trend — daily series for top-5 products (30 days)
 *   POST /api/admin/seed-sales-data      — trigger seed script programmatically
 */

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ─── helpers ──────────────────────────────────────────────────────────────────

function handleError(res, error) {
  const status = error.status || 500;
  const message = error.message || "Internal server error";
  res.status(status).json({ message });
}

/**
 * Return a Date object for N days ago at 00:00:00 UTC.
 */
function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/**
 * Format a Date to a readable string like "Apr 22, 2026".
 */
function fmtDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Classify a product based on daysUntilStockout or stock-only fallback.
 */
function classify(daysLeft, hasSalesData, stock) {
  if (!hasSalesData) {
    // fallback: stock-only
    if (stock <= 5) return "Critical";
    if (stock <= 20) return "Low";
    if (stock <= 50) return "Moderate";
    return "Healthy";
  }
  if (daysLeft <= 7) return "Critical";
  if (daysLeft <= 30) return "Low";
  if (daysLeft <= 90) return "Moderate";
  return "Healthy";
}

// ─── GET /api/admin/forecast ──────────────────────────────────────────────────

exports.getForecast = async (req, res) => {
  try {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    const from30 = daysAgo(30);
    const from90 = daysAgo(90);
    const from7  = daysAgo(7);
    const from14 = daysAgo(14);

    // Fetch all non-deleted products
    const products = await Product.find({ status: { $ne: "deleted" } })
      .select("_id name category images stock trendingScore")
      .lean();

    if (products.length === 0) {
      return res.json({ products: [], summary: { critical: 0, low: 0, moderate: 0, healthy: 0, inactive: 0, total: 0 } });
    }

    const productIds = products.map((p) => p._id);

    // ── Aggregate units sold per product for three windows ──────────────────
    // We do three aggregations in parallel: 30-day, 90-day, last-7-day, prev-7-day

    const [agg30, agg90, agg7, aggPrev7] = await Promise.all([
      // 30-day totals
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from30 },
            status: { $in: ["PAID", "DELIVERED"] },
            paymentStatus: "PAID",
            "items.product": { $in: productIds },
          },
        },
        { $unwind: "$items" },
        {
          $match: { "items.product": { $in: productIds } },
        },
        {
          $group: {
            _id: "$items.product",
            units: { $sum: "$items.quantity" },
          },
        },
      ]),

      // 90-day totals
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from90 },
            status: { $in: ["PAID", "DELIVERED"] },
            paymentStatus: "PAID",
            "items.product": { $in: productIds },
          },
        },
        { $unwind: "$items" },
        {
          $match: { "items.product": { $in: productIds } },
        },
        {
          $group: {
            _id: "$items.product",
            units: { $sum: "$items.quantity" },
          },
        },
      ]),

      // last 7 days
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from7 },
            status: { $in: ["PAID", "DELIVERED"] },
            paymentStatus: "PAID",
            "items.product": { $in: productIds },
          },
        },
        { $unwind: "$items" },
        {
          $match: { "items.product": { $in: productIds } },
        },
        {
          $group: {
            _id: "$items.product",
            units: { $sum: "$items.quantity" },
          },
        },
      ]),

      // prior 7 days (8–14 days ago)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from14, $lt: from7 },
            status: { $in: ["PAID", "DELIVERED"] },
            paymentStatus: "PAID",
            "items.product": { $in: productIds },
          },
        },
        { $unwind: "$items" },
        {
          $match: { "items.product": { $in: productIds } },
        },
        {
          $group: {
            _id: "$items.product",
            units: { $sum: "$items.quantity" },
          },
        },
      ]),
    ]);

    // Convert to maps for O(1) lookup
    const map30     = new Map(agg30.map((r) => [String(r._id), r.units]));
    const map90     = new Map(agg90.map((r) => [String(r._id), r.units]));
    const map7      = new Map(agg7.map((r) => [String(r._id), r.units]));
    const mapPrev7  = new Map(aggPrev7.map((r) => [String(r._id), r.units]));

    // ── Build per-product forecast rows ─────────────────────────────────────
    const summary = { critical: 0, low: 0, moderate: 0, healthy: 0, inactive: 0, total: 0 };
    const rows = [];

    for (const product of products) {
      const id = String(product._id);
      const stock = product.stock ?? 0;

      const units30 = map30.get(id) || 0;
      const units90 = map90.get(id) || 0;
      const units7  = map7.get(id) || 0;
      const unitsPrev7 = mapPrev7.get(id) || 0;

      let avgDailySales = 0;
      let hasSalesData = false;
      let usingWindow = 0;

      if (units30 > 0) {
        avgDailySales = units30 / 30;
        hasSalesData = true;
        usingWindow = 30;
      } else if (units90 > 0) {
        avgDailySales = units90 / 90;
        hasSalesData = true;
        usingWindow = 90;
      }

      let daysUntilStockout = null;
      let stockoutDate = null;
      let suggestedRestock = 0;
      let status;
      let trend = "stable";
      let trendPercent = 0;

      if (!hasSalesData) {
        status = "Inactive";
        // Override with stock-only fallback classification
        status = classify(null, false, stock);
        if (status !== "Inactive") {
          // Stock-only — no sales data to compute days
          daysUntilStockout = null;
          stockoutDate = null;
        }
      } else {
        const rawDays = avgDailySales > 0 ? Math.floor(stock / avgDailySales) : 999;
        daysUntilStockout = Math.min(rawDays, 999);

        const stockoutMs = now.getTime() + daysUntilStockout * 24 * 60 * 60 * 1000;
        stockoutDate = fmtDate(new Date(stockoutMs));

        status = classify(daysUntilStockout, true, stock);

        suggestedRestock = status === "Healthy" ? 0 : Math.ceil(avgDailySales * 30);
      }

      // Trend calculation
      if (hasSalesData) {
        if (unitsPrev7 === 0 && units7 > 0) {
          trend = "rising";
          trendPercent = 100;
        } else if (unitsPrev7 === 0 && units7 === 0) {
          trend = "stable";
          trendPercent = 0;
        } else {
          const pct = Math.round(((units7 - unitsPrev7) / unitsPrev7) * 100);
          trendPercent = Math.abs(pct);
          if (pct > 5) trend = "rising";
          else if (pct < -5) trend = "declining";
          else trend = "stable";
        }
      }

      // No sales data at all — classify as Inactive
      if (!hasSalesData && units90 === 0) {
        status = classify(null, false, stock);
      }

      summary[status.toLowerCase()]++;
      summary.total++;

      rows.push({
        productId: product._id,
        name: product.name,
        category: product.category,
        thumbnail: product.images?.[0] || null,
        currentStock: stock,
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        daysUntilStockout,
        stockoutDate,
        status,
        suggestedRestock,
        trend,
        trendPercent,
      });
    }

    // Sort by daysUntilStockout ascending (nulls last)
    rows.sort((a, b) => {
      if (a.daysUntilStockout === null && b.daysUntilStockout === null) return 0;
      if (a.daysUntilStockout === null) return 1;
      if (b.daysUntilStockout === null) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return res.json({ products: rows, summary });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── GET /api/admin/forecast/sales-trend ─────────────────────────────────────

exports.getSalesTrend = async (req, res) => {
  try {
    const from30 = daysAgo(30);
    const now = new Date();
    now.setUTCHours(23, 59, 59, 999);

    // Find top 5 products by units sold in last 30 days
    const topAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from30 },
          status: { $in: ["PAID", "DELIVERED"] },
          paymentStatus: "PAID",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          total: { $sum: "$items.quantity" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    if (topAgg.length === 0) {
      return res.json({ products: [], days: [], series: [] });
    }

    const topProductIds = topAgg.map((r) => r._id);

    // Fetch product names
    const productDocs = await Product.find({ _id: { $in: topProductIds } })
      .select("_id name")
      .lean();
    const nameMap = new Map(productDocs.map((p) => [String(p._id), p.name]));

    // Build 30 date labels
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      );
    }

    // Daily sales per product
    const dailyAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from30 },
          status: { $in: ["PAID", "DELIVERED"] },
          paymentStatus: "PAID",
          "items.product": { $in: topProductIds },
        },
      },
      { $unwind: "$items" },
      {
        $match: { "items.product": { $in: topProductIds } },
      },
      {
        $group: {
          _id: {
            product: "$items.product",
            day: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
          units: { $sum: "$items.quantity" },
        },
      },
    ]);

    // Build lookup: productId → dayString → units
    const salesLookup = new Map();
    for (const r of dailyAgg) {
      const pid = String(r._id.product);
      if (!salesLookup.has(pid)) salesLookup.set(pid, new Map());
      salesLookup.get(pid).set(r._id.day, r.units);
    }

    // Build series, respecting the order from topAgg (best-sellers first)
    const series = topProductIds.map((pid) => {
      const strId = String(pid);
      const name = nameMap.get(strId) || "Unknown";
      const dayMap = salesLookup.get(strId) || new Map();
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        data.push(dayMap.get(key) || 0);
      }
      return { name, data };
    });

    return res.json({
      products: topProductIds.map((id) => nameMap.get(String(id)) || "Unknown"),
      days,
      series,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── POST /api/admin/seed-sales-data ─────────────────────────────────────────

exports.runSeedSalesData = async (req, res) => {
  try {
    // Dynamically require the seed logic (without the CLI bootstrap)
    const Order = require("../models/Order");
    const Product = require("../models/Product");
    const User = require("../models/User");

    const SEED_PREFIX = "SEED_SALES_";
    const DAYS = 90;
    const TREND_END_MULTIPLIER = 1.3;
    const TIER = {
      high:   { min: 2, max: 5 },
      medium: { min: 0, max: 2 },
      slow:   { min: 0, max: 1 },
    };
    const SALE_PROB = { high: 0.75, medium: 0.50, slow: 0.20 };

    const rand    = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));

    const trendMultiplier = (dayIndex) =>
      1 + ((TREND_END_MULTIPLIER - 1) * dayIndex) / (DAYS - 1);

    const tierForRank = (rank, total) => {
      if (rank / total < 0.3) return "high";
      if (rank / total < 0.7) return "medium";
      return "slow";
    };

    const buildOrder = (userId, productId, quantity, price, date) => {
      const ref = `${SEED_PREFIX}${productId}_${date.toISOString().slice(0, 10)}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        user: userId,
        items: [{ product: productId, quantity, price }],
        totalPrice: quantity * price,
        status: Math.random() < 0.5 ? "DELIVERED" : "PAID",
        paymentMethod: Math.random() < 0.5 ? "STRIPE" : "MANUAL",
        paymentStatus: "PAID",
        paymentReference: ref,
        createdAt: date,
        updatedAt: date,
      };
    };

    // Idempotency check
    const existingCount = await Order.countDocuments({
      paymentReference: { $regex: `^${SEED_PREFIX}` },
    });
    if (existingCount > 0) {
      return res.json({
        message: `Seed data already present (${existingCount} seeded orders). Remove them first to re-seed.`,
        skipped: true,
        existingCount,
      });
    }

    const products = await Product.find({ status: { $ne: "deleted" } })
      .sort({ trendingScore: -1 })
      .lean();

    if (products.length === 0) {
      return res.json({ message: "No products found.", ordersCreated: 0 });
    }

    const users = await User.find({ role: "customer" }).select("_id").limit(20).lean();
    let userIds = users.map((u) => u._id);
    if (userIds.length === 0) {
      const admin = await User.findOne({ role: "admin" }).select("_id").lean();
      if (admin) userIds.push(admin._id);
      else userIds.push(new mongoose.Types.ObjectId());
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orderDocs = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const tier = tierForRank(i, products.length);

      for (let d = 0; d < DAYS; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (DAYS - 1 - d));

        if (Math.random() > SALE_PROB[tier]) continue;

        const { min, max } = TIER[tier];
        const rawQty = randInt(min, max);
        if (rawQty === 0) continue;

        const qty = Math.max(1, Math.round(rawQty * trendMultiplier(d)));
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        orderDocs.push(buildOrder(userId, product._id, qty, product.price, date));
      }
    }

    if (orderDocs.length === 0) {
      return res.json({ message: "All daily rolls resulted in 0 sales.", ordersCreated: 0 });
    }

    await Order.insertMany(orderDocs, { timestamps: false });

    // Recalculate trending scores
    try {
      const { updateTrendingScores } = require("../services/trending.service");
      await updateTrendingScores();
    } catch (_) {
      // non-fatal
    }

    return res.json({
      message: `Seeded ${orderDocs.length} orders across ${products.length} products.`,
      ordersCreated: orderDocs.length,
      productsSeeded: products.length,
    });
  } catch (error) {
    handleError(res, error);
  }
};
