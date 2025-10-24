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

// POST /api/bars/:id/report - Report a bar (with rate limiting)
router.post("/:id/report", checkBannedIP, rateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Reason is required" });
    }

    if (reason.length > 500) {
      return res.status(400).json({ error: "Reason is too long (max 500 characters)" });
    }

    // Check if bar exists
    const bar = await db.get("SELECT id FROM bars WHERE id = ?", [id]);
    if (!bar) {
      return res.status(404).json({ error: "Bar not found" });
    }

    const ip = req.ip || req.connection.remoteAddress;

    // Insert report
    const result = await db.run(
      "INSERT INTO reports (barId, reason, reportedByIP) VALUES (?, ?, ?)",
      [id, reason.trim(), ip]
    );

    res.status(201).json({
      message: "Report submitted successfully",
      id: result.id,
    });
  } catch (error) {
    console.error("Error reporting bar:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

module.exports = router;
