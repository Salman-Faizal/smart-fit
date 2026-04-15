require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const cron = require("node-cron");
const { updateTrendingScores } = require("./services/trending.service");

const PORT = process.env.PORT || 3000;

// Connect DB, seed admin settings, and bootstrap trending scores if needed
connectDB().then(async () => {
  try {
    const { seedAdminSettings } = require("./services/admin.service");
    await seedAdminSettings();
  } catch (err) {
    console.error("[startup] Failed to seed admin settings:", err.message);
  }

  // Bootstrap trending scores on first run: if every active product still has
  // trendingScore = 0 the quiz scoring is flat. Run one recalculation so the
  // first demo has real ranking data without waiting for the 6-hour cron.
  try {
    const Product = require("./models/Product");
    const totalActive = await Product.countDocuments({ status: "active" });
    if (totalActive > 0) {
      const withScore = await Product.countDocuments({
        status: "active",
        trendingScore: { $gt: 0 },
      });
      if (withScore === 0) {
        updateTrendingScores().catch(() => {});
      }
    }
  } catch {
    // Non-critical — quiz still works without trending data
  }
});

// Schedule trending score recalculation every 6 hours
// Cron: minute hour day month weekday
// "0 */6 * * *" = at minute 0, every 6th hour
cron.schedule("0 */6 * * *", () => {
  updateTrendingScores()
    .then((result) => {
      console.log(
        `[cron] Trending scores updated — ${result.updated} products, ran at ${result.ranAt.toISOString()}`,
      );
    })
    .catch((err) => {
      console.error("[cron] Failed to update trending scores:", err.message);
    });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
