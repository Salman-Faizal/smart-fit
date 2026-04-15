/**
 * diagnoseQuiz.js
 *
 * Diagnoses why the Style Quiz returns 0 results by inspecting:
 *  1. All distinct category values in the Product collection
 *  2. A sample of 5 active in-stock products
 *  3. How many products have trendingScore = 0
 *  4. How each quiz category label matches the DB via the current regex approach
 *
 * Usage (from server/ directory):
 *   node scripts/diagnoseQuiz.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const Product = require("../models/Product");

  // 1. Distinct categories
  const categories = await Product.distinct("category");
  console.log("\n=== DISTINCT CATEGORY VALUES IN DB ===");
  console.log(categories);

  // 2. Sample of 5 active in-stock products
  const samples = await Product.find({ status: "active", stock: { $gt: 0 } })
    .select("name category price stock status description trendingScore")
    .limit(5)
    .lean();

  console.log("\n=== SAMPLE PRODUCTS (active, in-stock) ===");
  samples.forEach((p) => {
    console.log({
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      status: p.status,
      trendingScore: p.trendingScore,
      description: p.description ? p.description.substring(0, 60) + "..." : "(empty)",
    });
  });

  // 3. Trending score distribution
  const zeroTrending = await Product.countDocuments({ trendingScore: 0 });
  const totalProducts = await Product.countDocuments();
  const activeInStock = await Product.countDocuments({ status: "active", stock: { $gt: 0 } });
  console.log("\n=== TRENDING SCORES ===");
  console.log(`Total products: ${totalProducts}`);
  console.log(`Active + in-stock: ${activeInStock}`);
  console.log(`Products with trendingScore = 0: ${zeroTrending}/${totalProducts}`);

  // 4. Category match test against quiz labels
  const quizLabels = [
    "T-Shirts",
    "Shirts",
    "Trousers",
    "Chinos",
    "Jackets",
    "Shorts",
    "Activewear",
    "Accessories",
  ];

  console.log("\n=== CATEGORY MATCH TEST (old regex, strip trailing s) ===");
  for (const label of quizLabels) {
    const regex = label.replace(/s$/i, "");
    const count = await Product.countDocuments({
      category: { $regex: regex, $options: "i" },
      status: "active",
      stock: { $gt: 0 },
    });
    console.log(`  "${label}" → /${regex}/i → ${count} product(s)`);
  }

  // 5. Budget range test
  console.log("\n=== PRICE DISTRIBUTION (active, in-stock) ===");
  const brackets = [
    { label: "Under LKR 2,000", filter: { $lt: 2000 } },
    { label: "LKR 2,000–4,000", filter: { $gte: 2000, $lte: 4000 } },
    { label: "LKR 4,000–7,000", filter: { $gt: 4000, $lte: 7000 } },
    { label: "LKR 7,000+", filter: { $gt: 7000 } },
  ];
  for (const b of brackets) {
    const count = await Product.countDocuments({
      price: b.filter,
      status: "active",
      stock: { $gt: 0 },
    });
    console.log(`  ${b.label}: ${count} product(s)`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
