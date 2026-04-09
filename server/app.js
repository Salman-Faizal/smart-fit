const express = require("express");
const routes = require("./routes");
const cors = require("cors");

const app = express();

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    return ["http://localhost:5173"];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (e.g. curl, mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
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
