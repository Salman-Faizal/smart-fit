require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const cron = require("node-cron");
const { updateTrendingScores } = require("./services/trending.service");

const PORT = process.env.PORT || 3000;

// Connect DB and seed admin settings
connectDB().then(async () => {
  try {
    const { seedAdminSettings } = require("./services/admin.service");
    await seedAdminSettings();
  } catch (err) {
    console.error("[startup] Failed to seed admin settings:", err.message);
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
