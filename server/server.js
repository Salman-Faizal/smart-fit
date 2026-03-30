const express = require("express");
const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();
const PORT = 3000;

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      message: "User Registered Successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create user",
      err,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
