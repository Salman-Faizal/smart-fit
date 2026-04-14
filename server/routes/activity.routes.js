const express = require("express");
const router = express.Router();
const { optionalProtect } = require("../middleware/auth.middleware");
const { trackEvent } = require("../controllers/activity.controller");

// Open to all (authenticated or anonymous) — optionalProtect attaches
// req.user if a valid JWT is present, leaving it undefined for guests.
router.post("/track", optionalProtect, trackEvent);

module.exports = router;
