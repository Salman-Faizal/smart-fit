const express = require("express");
const routes = require("./routes");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// all routes handled here
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

module.exports = app;
