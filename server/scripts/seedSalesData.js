/**
 * seedSalesData.js
 *
 * Generates realistic Order documents spanning the last 90 days for all
 * active products. Products are bucketed into high/medium/slow tiers and
 * seeded with daily sales volumes that match each tier, with a gentle
 * upward trend over the 90-day window.
 *
 * Usage (from server/ directory):
 *   node scripts/seedSalesData.js
 *
 * Idempotent: existing seeded orders are detected by a special paymentReference
 * prefix ("SEED_") and skipped if already present, so the script is safe to
 * re-run without creating duplicates.
 *
 * After seeding it updates each product's trendingScore via the service.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEED_PREFIX = "SEED_SALES_";
const DAYS = 90;

// Per-tier base daily sales (min/max).  Applied BEFORE the trend multiplier.
const TIER = {
  high:   { min: 2, max: 5 },
  medium: { min: 0, max: 2 },
  slow:   { min: 0, max: 1 },   // only a few days per week actually get a sale
};

// Probability that ANY sale happens on a given day (per tier)
const SALE_PROB = {
  high:   0.75,   // weekend dips → ~25 % of days zero
  medium: 0.50,
  slow:   0.20,
};

// Trend: by day 90 sales are multiplied by this factor (linear interpolation)
const TREND_END_MULTIPLIER = 1.3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

function trendMultiplier(dayIndex) {
  // dayIndex 0 → 1.0,  dayIndex DAYS-1 → TREND_END_MULTIPLIER
  return 1 + ((TREND_END_MULTIPLIER - 1) * dayIndex) / (DAYS - 1);
}

function tierForRank(rank, total) {
  if (rank / total < 0.3) return "high";
  if (rank / total < 0.7) return "medium";
  return "slow";
}

// Build one Order document object (not saved yet)
function buildOrder(userId, productId, quantity, price, date) {
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
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  await connectDB();

  // Check idempotency — look for any existing seeded order
  const existingCount = await Order.countDocuments({
    paymentReference: { $regex: `^${SEED_PREFIX}` },
  });
  if (existingCount > 0) {
    console.log(
      `Seed data already present (${existingCount} seeded orders found). Skipping insertion.`,
    );
    console.log(
      "To re-seed, first remove existing seeded orders (paymentReference starts with SEED_SALES_).",
    );
    await mongoose.disconnect();
    return;
  }

  // Fetch active products, sorted by trendingScore descending so rank reflects popularity
  const products = await Product.find({ status: { $ne: "deleted" } })
    .sort({ trendingScore: -1 })
    .lean();

  if (products.length === 0) {
    console.log("No products found — nothing to seed.");
    await mongoose.disconnect();
    return;
  }

  // Grab a handful of real user IDs; fall back to a placeholder
  const users = await User.find({ role: "customer" })
    .select("_id")
    .limit(20)
    .lean();

  const userIds = users.map((u) => u._id);
  // If no real customers exist use the first admin or create a placeholder
  if (userIds.length === 0) {
    const admin = await User.findOne({ role: "admin" }).select("_id").lean();
    if (admin) userIds.push(admin._id);
    else {
      console.warn("No users found — using a dummy ObjectId as placeholder.");
      userIds.push(new mongoose.Types.ObjectId());
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const orderDocs = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const tier = tierForRank(i, products.length);

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAYS - 1 - d)); // oldest first

      // Decide whether any sale happens this day
      if (Math.random() > SALE_PROB[tier]) continue;

      const { min, max } = TIER[tier];
      const rawQty = randInt(min, max);
      if (rawQty === 0) continue;

      // Apply trend multiplier
      const qty = Math.max(1, Math.round(rawQty * trendMultiplier(d)));

      // Pick a random user
      const userId = userIds[Math.floor(Math.random() * userIds.length)];

      orderDocs.push(buildOrder(userId, product._id, qty, product.price, date));
    }
  }

  if (orderDocs.length === 0) {
    console.log("Nothing to insert (all daily rolls resulted in 0 sales).");
    await mongoose.disconnect();
    return;
  }

  // Bulk insert
  await Order.insertMany(orderDocs, { timestamps: false });

  // Update trendingScores based on seeded data
  try {
    const { updateTrendingScores } = require("../services/trending.service");
    await updateTrendingScores();
    console.log("trendingScore recalculated.");
  } catch (err) {
    console.warn("Could not recalculate trending scores:", err.message);
  }

  console.log(
    `Seeded ${orderDocs.length} orders across ${products.length} products.`,
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
