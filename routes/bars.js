const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { rateLimiter, checkBannedIP } = require("../middleware/rateLimiter");

// GET /api/bars - Get all approved bars
router.get("/", async (req, res) => {
  try {
    const bars = await db.all("SELECT * FROM bars WHERE status = ?", [
      "approved",
    ]);
    res.json(bars);
  } catch (error) {
    console.error("Error fetching bars:", error);
    res.status(500).json({ error: "Failed to fetch bars" });
  }
});

// POST /api/bars - Submit a new bar (with rate limiting and IP ban check)
router.post("/", checkBannedIP, rateLimiter, async (req, res) => {
  try {
    const { name, latitude, longitude, regularPrice } = req.body;

    // Validation
    if (!name || !latitude || !longitude || !regularPrice) {
      return res.status(400).json({
        error:
          "Missing required fields: name, latitude, longitude, regularPrice",
      });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof regularPrice !== "number"
    ) {
      return res.status(400).json({
        error: "latitude, longitude, and regularPrice must be numbers",
      });
    }

    const ip = req.ip || req.connection.remoteAddress;

    const result = await db.run(
      "INSERT INTO bars (name, latitude, longitude, regularPrice, submittedByIP) VALUES (?, ?, ?, ?, ?)",
      [name, latitude, longitude, regularPrice, ip]
    );

    res.status(201).json({
      message: "Bar submitted successfully and is pending approval",
      id: result.id,
    });
  } catch (error) {
    console.error("Error creating bar:", error);
    res.status(500).json({ error: "Failed to create bar" });
  }
});

module.exports = router;
