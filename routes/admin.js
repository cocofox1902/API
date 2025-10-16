const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { authenticateAdmin } = require("../middleware/auth");

// POST /api/admin/login - Admin login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const admin = await db.get("SELECT * FROM admin_users WHERE username = ?", [
      username,
    ]);

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      username: admin.username,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/admin/bars - Get bars by status (requires auth)
router.get("/bars", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let bars;

    if (status) {
      bars = await db.all(
        "SELECT * FROM bars WHERE status = ? ORDER BY submittedAt DESC",
        [status]
      );
    } else {
      bars = await db.all("SELECT * FROM bars ORDER BY submittedAt DESC");
    }

    res.json(bars);
  } catch (error) {
    console.error("Error fetching bars:", error);
    res.status(500).json({ error: "Failed to fetch bars" });
  }
});

// PATCH /api/admin/bars/:id/approve - Approve a bar
router.patch("/bars/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run("UPDATE bars SET status = ? WHERE id = ?", ["approved", id]);

    res.json({ message: "Bar approved successfully" });
  } catch (error) {
    console.error("Error approving bar:", error);
    res.status(500).json({ error: "Failed to approve bar" });
  }
});

// PATCH /api/admin/bars/:id/reject - Reject a bar
router.patch("/bars/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run("UPDATE bars SET status = ? WHERE id = ?", ["rejected", id]);

    res.json({ message: "Bar rejected successfully" });
  } catch (error) {
    console.error("Error rejecting bar:", error);
    res.status(500).json({ error: "Failed to reject bar" });
  }
});

// DELETE /api/admin/bars/:id - Delete a bar
router.delete("/bars/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run("DELETE FROM bars WHERE id = ?", [id]);

    res.json({ message: "Bar deleted successfully" });
  } catch (error) {
    console.error("Error deleting bar:", error);
    res.status(500).json({ error: "Failed to delete bar" });
  }
});

// GET /api/admin/banned-ips - Get all banned IPs
router.get("/banned-ips", authenticateAdmin, async (req, res) => {
  try {
    const bannedIPs = await db.all(
      "SELECT * FROM banned_ips ORDER BY bannedAt DESC"
    );
    res.json(bannedIPs);
  } catch (error) {
    console.error("Error fetching banned IPs:", error);
    res.status(500).json({ error: "Failed to fetch banned IPs" });
  }
});

// POST /api/admin/banned-ips - Ban an IP
router.post("/banned-ips", authenticateAdmin, async (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "IP address required" });
    }

    await db.run("INSERT INTO banned_ips (ip, reason) VALUES (?, ?)", [
      ip,
      reason || "No reason provided",
    ]);

    res.json({ message: "IP banned successfully" });
  } catch (error) {
    console.error("Error banning IP:", error);
    res.status(500).json({ error: "Failed to ban IP" });
  }
});

// DELETE /api/admin/banned-ips/:ip - Unban an IP
router.delete("/banned-ips/:ip", authenticateAdmin, async (req, res) => {
  try {
    const { ip } = req.params;

    await db.run("DELETE FROM banned_ips WHERE ip = ?", [ip]);

    res.json({ message: "IP unbanned successfully" });
  } catch (error) {
    console.error("Error unbanning IP:", error);
    res.status(500).json({ error: "Failed to unban IP" });
  }
});

// GET /api/admin/stats - Get dashboard statistics
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const pending = await db.get(
      "SELECT COUNT(*) as count FROM bars WHERE status = ?",
      ["pending"]
    );
    const approved = await db.get(
      "SELECT COUNT(*) as count FROM bars WHERE status = ?",
      ["approved"]
    );
    const rejected = await db.get(
      "SELECT COUNT(*) as count FROM bars WHERE status = ?",
      ["rejected"]
    );
    const bannedIPs = await db.get("SELECT COUNT(*) as count FROM banned_ips");

    res.json({
      pending: pending.count,
      approved: approved.count,
      rejected: rejected.count,
      bannedIPs: bannedIPs.count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
