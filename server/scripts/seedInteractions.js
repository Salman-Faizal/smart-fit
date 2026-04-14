/**
 * seedInteractions.js
 *
 * Generates realistic UserActivity records across 10 behavioural personas
 * covering 60 days of browsing, wishlisting, carting, and purchasing.
 * After seeding, runs updateTrendingScores() so trendingScore fields are
 * populated immediately.
 *
 * Usage (from server/ directory):
 *   node scripts/seedInteractions.js
 *
 * Safe to re-run: existing activity records for seed users are cleared first.
 * Real user records are never touched.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Product = require("../models/Product");
const UserActivity = require("../models/UserActivity");
const { updateTrendingScores } = require("../services/trending.service");

// ---------------------------------------------------------------------------
// Persona definitions
// ---------------------------------------------------------------------------

/**
 * Each persona describes a type of shopper.
 *
 * categoryAffinity: categories this persona gravitates toward
 * viewsPerWeek:     avg browsing sessions per week
 * purchaseRate:     probability of purchasing an item they carted (0–1)
 * wishlistRate:     probability of wishlisting a viewed item (0–1)
 * cartRate:         probability of carting a wishlisted/viewed item (0–1)
 * newUser:          if true, generate zero history (cold-start test)
 */
const PERSONAS = [
  {
    name: "formal_buyer_1",
    email: "seed.formal1@smartfit.test",
    categoryKeywords: ["suit", "shirt", "formal", "blazer", "trouser"],
    viewsPerWeek: 8,
    purchaseRate: 0.4,
    wishlistRate: 0.3,
    cartRate: 0.5,
    newUser: false,
  },
  {
    name: "formal_buyer_2",
    email: "seed.formal2@smartfit.test",
    categoryKeywords: ["suit", "blazer", "tie", "shirt"],
    viewsPerWeek: 5,
    purchaseRate: 0.5,
    wishlistRate: 0.2,
    cartRate: 0.4,
    newUser: false,
  },
  {
    name: "casual_browser_1",
    email: "seed.casual1@smartfit.test",
    categoryKeywords: ["jean", "t-shirt", "hoodie", "short", "sneaker"],
    viewsPerWeek: 12,
    purchaseRate: 0.15,
    wishlistRate: 0.5,
    cartRate: 0.3,
    newUser: false,
  },
  {
    name: "casual_browser_2",
    email: "seed.casual2@smartfit.test",
    categoryKeywords: ["jean", "casual", "pant", "jacket"],
    viewsPerWeek: 10,
    purchaseRate: 0.2,
    wishlistRate: 0.4,
    cartRate: 0.35,
    newUser: false,
  },
  {
    name: "power_browser",
    email: "seed.power@smartfit.test",
    categoryKeywords: [], // views everything — no category filter
    viewsPerWeek: 20,
    purchaseRate: 0.05,
    wishlistRate: 0.6,
    cartRate: 0.1,
    newUser: false,
  },
  {
    name: "deal_seeker",
    email: "seed.deal@smartfit.test",
    categoryKeywords: ["trouser", "pant", "shirt", "belt"],
    viewsPerWeek: 7,
    purchaseRate: 0.35,
    wishlistRate: 0.25,
    cartRate: 0.45,
    newUser: false,
  },
  {
    name: "sporty_shopper",
    email: "seed.sporty@smartfit.test",
    categoryKeywords: ["short", "shoe", "sock", "casual", "t-shirt"],
    viewsPerWeek: 9,
    purchaseRate: 0.3,
    wishlistRate: 0.35,
    cartRate: 0.4,
    newUser: false,
  },
  {
    name: "occasional_buyer",
    email: "seed.occasional@smartfit.test",
    categoryKeywords: ["jacket", "blazer", "trouser", "shirt"],
    viewsPerWeek: 3,
    purchaseRate: 0.6,
    wishlistRate: 0.15,
    cartRate: 0.7,
    newUser: false,
  },
  {
    name: "new_user_cold_start",
    email: "seed.newuser@smartfit.test",
    categoryKeywords: [],
    viewsPerWeek: 0,
    purchaseRate: 0,
    wishlistRate: 0,
    cartRate: 0,
    newUser: true, // zero history — tests cold-start fallback
  },
  {
    name: "light_browser",
    email: "seed.light@smartfit.test",
    categoryKeywords: ["accessory", "belt", "shoe"],
    viewsPerWeek: 2,
    purchaseRate: 0.1,
    wishlistRate: 0.2,
    cartRate: 0.15,
    newUser: false,
  },
];

const DAYS = 60;
const SEED_PASSWORD = "SeedPass123!";
const SESSION_ID_PREFIX = "seed-session-";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat() {
  return Math.random();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Randomise the time within the day so events don't all cluster at midnight
  d.setHours(randomBetween(8, 22), randomBetween(0, 59), randomBetween(0, 59));
  return d;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Return a random subset of `arr` of size `n`. */
function sampleN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/**
 * Filter products whose category matches any of the persona's keywords.
 * If no keywords defined (power_browser, new_user) return all products.
 */
function filterByPersona(products, keywords) {
  if (!keywords.length) return products;
  return products.filter((p) =>
    keywords.some((kw) => p.category?.toLowerCase().includes(kw)),
  );
}

// ---------------------------------------------------------------------------
// Activity generation
// ---------------------------------------------------------------------------

async function generateActivitiesForPersona(user, persona, allProducts) {
  if (persona.newUser) {
    console.log(`  [${persona.name}] Cold-start — no activity generated`);
    return [];
  }

  const affinityProducts = filterByPersona(allProducts, persona.categoryKeywords);
  // Fall back to all products if affinity pool is empty (sparse catalogue)
  const pool = affinityProducts.length >= 3 ? affinityProducts : allProducts;

  const events = [];
  const userId = user._id;
  const sessionId = `${SESSION_ID_PREFIX}${user._id}`;

  const totalViewSessions = Math.round((persona.viewsPerWeek / 7) * DAYS);

  for (let s = 0; s < totalViewSessions; s++) {
    const dayOffset = randomBetween(0, DAYS - 1);
    const sessionTs = daysAgo(dayOffset);

    // Pick 1–4 products to view in this session
    const sessionProducts = sampleN(pool, randomBetween(1, 4));

    for (const product of sessionProducts) {
      // View event
      events.push({
        userId,
        sessionId,
        eventType: "view",
        productId: product._id,
        timestamp: new Date(sessionTs),
      });

      // Wishlist?
      if (randomFloat() < persona.wishlistRate) {
        events.push({
          userId,
          sessionId,
          eventType: "wishlist_add",
          productId: product._id,
          timestamp: new Date(sessionTs.getTime() + 30_000),
        });

        // Add to cart after wishlisting?
        if (randomFloat() < persona.cartRate) {
          events.push({
            userId,
            sessionId,
            eventType: "cart_add",
            productId: product._id,
            timestamp: new Date(sessionTs.getTime() + 90_000),
          });

          // Purchase?
          if (randomFloat() < persona.purchaseRate) {
            events.push({
              userId,
              sessionId,
              eventType: "purchase",
              productId: product._id,
              timestamp: new Date(sessionTs.getTime() + 180_000),
            });
          }
        }
      } else if (randomFloat() < persona.cartRate * 0.6) {
        // Sometimes people add to cart without wishlisting
        events.push({
          userId,
          sessionId,
          eventType: "cart_add",
          productId: product._id,
          timestamp: new Date(sessionTs.getTime() + 60_000),
        });

        if (randomFloat() < persona.purchaseRate) {
          events.push({
            userId,
            sessionId,
            eventType: "purchase",
            productId: product._id,
            timestamp: new Date(sessionTs.getTime() + 120_000),
          });
        }
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await connectDB();
  console.log("\n🌱 Smart Fit — Interaction Seed Script");
  console.log("======================================\n");

  // ── Load product catalogue ─────────────────────────────────────────────────
  const allProducts = await Product.find({ stock: { $gt: 0 } })
    .select("_id category trendingScore")
    .lean();

  if (allProducts.length === 0) {
    console.error("❌ No products found in the database. Add products first.");
    process.exit(1);
  }
  console.log(`📦 Found ${allProducts.length} products in catalogue\n`);

  // ── Upsert seed users ──────────────────────────────────────────────────────
  const seedUsers = [];
  for (const persona of PERSONAS) {
    let user = await User.findOne({ email: persona.email });
    if (!user) {
      user = await User.create({
        name: persona.name,
        email: persona.email,
        password: SEED_PASSWORD,
        role: "customer",
      });
      console.log(`  ✅ Created seed user: ${persona.email}`);
    } else {
      console.log(`  ♻️  Reusing existing seed user: ${persona.email}`);
    }
    seedUsers.push({ user, persona });
  }

  // ── Clear existing seed activity (idempotent re-runs) ─────────────────────
  const seedUserIds = seedUsers.map(({ user }) => user._id);
  const deleted = await UserActivity.deleteMany({ userId: { $in: seedUserIds } });
  console.log(`\n🗑  Cleared ${deleted.deletedCount} existing seed activity records`);

  // ── Generate and bulk-insert activity events ───────────────────────────────
  console.log("\n📊 Generating activity events:\n");
  let totalEvents = 0;

  for (const { user, persona } of seedUsers) {
    const events = await generateActivitiesForPersona(user, persona, allProducts);

    if (events.length > 0) {
      await UserActivity.insertMany(events, { ordered: false });
    }

    const views = events.filter((e) => e.eventType === "view").length;
    const purchases = events.filter((e) => e.eventType === "purchase").length;
    const wishlists = events.filter((e) => e.eventType === "wishlist_add").length;

    console.log(
      `  ${persona.newUser ? "❄️ " : "👤"} ${persona.name.padEnd(24)} ` +
        `${String(events.length).padStart(4)} events ` +
        `(${views} views, ${wishlists} wishlist, ${purchases} purchases)`,
    );
    totalEvents += events.length;
  }

  console.log(`\n✅ Inserted ${totalEvents} activity records across ${PERSONAS.length} users`);

  // ── Recalculate trending scores ────────────────────────────────────────────
  console.log("\n📈 Recalculating trending scores…");
  try {
    const result = await updateTrendingScores();
    console.log(
      `✅ Updated trendingScore for ${result.updated} products (ran at ${result.ranAt.toISOString()})`,
    );
  } catch (err) {
    console.error("⚠️  updateTrendingScores failed:", err.message);
    console.log("   Run it manually via POST /api/admin/recalculate-trending");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n======================================");
  console.log("🌱 Seed complete. System state:");
  console.log(`   Seed users : ${seedUsers.length}`);
  console.log(`   Events     : ${totalEvents}`);
  console.log(`   Products   : ${allProducts.length}`);
  console.log("\nCold-start test account:");
  console.log("   Email    : seed.newuser@smartfit.test");
  console.log("   Password : SeedPass123!");
  console.log("\nFormal buyer (rich history):");
  console.log("   Email    : seed.formal1@smartfit.test");
  console.log("   Password : SeedPass123!\n");

  mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  mongoose.connection.close();
  process.exit(1);
});
