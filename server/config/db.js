require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    process.stderr.write(`[db] Connection failed: ${error.message}\n`);
  }
};

module.exports = connectDB;
