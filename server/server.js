const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const app = express();
const PORT = 3000;

connectDB();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
