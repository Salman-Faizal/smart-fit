const express = require("express");
const routes = require("./routes");

const app = express();

app.use(express.json());

// all routes handled here
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

module.exports = app;
