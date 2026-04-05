const connectDB = require("../config/db");
const User = require("../models/User");

const createAdmin = async (name, email, password, role) => {
  try {
    await connectDB();
    await User.create({
      name,
      email,
      password,
      role,
    });
    console.log("Admin created successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin("test-admin-1", "test@admin.com", "123456", "admin");
