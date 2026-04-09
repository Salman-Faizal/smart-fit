const express = require("express");
const routes = require("./routes");
const cors = require("cors");

const app = express();

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;

  const defaults = ["http://localhost:5173"];

  if (!raw) return defaults;

  return [
    ...defaults,
    ...raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
};

const normalize = (url) => url?.replace(/\/$/, "");

const allowedOrigins = parseAllowedOrigins().map(normalize);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalize(origin);

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
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
