const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const db = require("../config/database");
const { authenticateAdmin } = require("../middleware/auth");

// POST /api/admin/login - Admin login (Step 1: Username/Password)
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

    // Check if 2FA is enabled
    if (admin.twofactorenabled) {
      // Return temporary token for 2FA verification
      const tempToken = jwt.sign(
        { id: admin.id, temp: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      return res.json({
        requiresTwoFactor: true,
        tempToken,
        message: "Please enter your 2FA code",
      });
    }

    // If 2FA not enabled, return full token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      username: admin.username,
      requiresTwoFactor: false,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/admin/verify-2fa - Verify 2FA code (Step 2)
router.post("/verify-2fa", async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: "Token and code required" });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.temp) {
        return res.status(401).json({ error: "Invalid token" });
      }
    } catch (err) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }

    // Get admin
    const admin = await db.get("SELECT * FROM admin_users WHERE id = ?", [
      decoded.id,
    ]);

    if (!admin || !admin.twofactorsecret) {
      return res.status(401).json({ error: "2FA not configured" });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: admin.twofactorsecret,
      encoding: "base32",
      token: code,
      window: 2, // Allow 2 time steps before/after
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid 2FA code" });
    }

    // Generate full access token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      username: admin.username,
      message: "2FA verified successfully",
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({ error: "2FA verification failed" });
  }
});

// POST /api/admin/setup-2fa - Generate 2FA secret and QR code
router.post("/setup-2fa", authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BudBeer Admin (${req.admin.username})`,
      issuer: "BudBeer",
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Save secret to database (not enabled yet)
    await db.run("UPDATE admin_users SET twoFactorSecret = ? WHERE id = ?", [
      secret.base32,
      adminId,
    ]);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: "Scan QR code with Google Authenticator",
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "2FA setup failed" });
  }
});

// POST /api/admin/enable-2fa - Enable 2FA after verification
router.post("/enable-2fa", authenticateAdmin, async (req, res) => {
  try {
    const { code } = req.body;
    const adminId = req.admin.id;

    if (!code) {
      return res.status(400).json({ error: "Verification code required" });
    }

    // Get admin with secret
    const admin = await db.get("SELECT * FROM admin_users WHERE id = ?", [
      adminId,
    ]);

    if (!admin.twofactorsecret) {
      return res
        .status(400)
        .json({ error: "2FA not set up. Run /setup-2fa first" });
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: admin.twofactorsecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Enable 2FA
    await db.run("UPDATE admin_users SET twoFactorEnabled = ? WHERE id = ?", [
      true,
      adminId,
    ]);

    res.json({
      message: "2FA enabled successfully",
      enabled: true,
    });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

// POST /api/admin/disable-2fa - Disable 2FA
router.post("/disable-2fa", authenticateAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const adminId = req.admin.id;

    if (!password) {
      return res.status(400).json({ error: "Password required" });
    }

    // Verify password
    const admin = await db.get("SELECT * FROM admin_users WHERE id = ?", [
      adminId,
    ]);

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Disable 2FA
    await db.run(
      "UPDATE admin_users SET twoFactorEnabled = ?, twoFactorSecret = ? WHERE id = ?",
      [false, null, adminId]
    );

    res.json({
      message: "2FA disabled successfully",
      enabled: false,
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

// GET /api/admin/2fa-status - Check if 2FA is enabled
router.get("/2fa-status", authenticateAdmin, async (req, res) => {
  try {
    const admin = await db.get(
      "SELECT twoFactorEnabled FROM admin_users WHERE id = ?",
      [req.admin.id]
    );

    res.json({
      enabled: admin.twofactorenabled || false,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    res.status(500).json({ error: "Failed to fetch 2FA status" });
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

// PUT /api/admin/bars/:id - Update a bar (name, price, location)
router.put("/bars/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, regularPrice } = req.body;

    // Validate required fields
    if (!name || !latitude || !longitude || !regularPrice) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate price
    const price = parseFloat(regularPrice);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Update bar
    await db.run(
      "UPDATE bars SET name = ?, latitude = ?, longitude = ?, regularPrice = ? WHERE id = ?",
      [name.trim(), lat, lng, price, id]
    );

    res.json({ message: "Bar updated successfully" });
  } catch (error) {
    console.error("Error updating bar:", error);
    res.status(500).json({ error: "Failed to update bar" });
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
    const reports = await db.get(
      "SELECT COUNT(*) as count FROM reports WHERE status = ?",
      ["pending"]
    );

    res.json({
      pending: pending.count,
      approved: approved.count,
      rejected: rejected.count,
      bannedIPs: bannedIPs.count,
      reports: reports.count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/reports - Get all reports
router.get("/reports", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let reports;

    if (status) {
      reports = await db.all(
        `SELECT reports.*, bars.name as barName, bars.latitude, bars.longitude 
         FROM reports 
         JOIN bars ON reports.barId = bars.id 
         WHERE reports.status = ? 
         ORDER BY reports.reportedAt DESC`,
        [status]
      );
    } else {
      reports = await db.all(
        `SELECT reports.*, bars.name as barName, bars.latitude, bars.longitude 
         FROM reports 
         JOIN bars ON reports.barId = bars.id 
         ORDER BY reports.reportedAt DESC`
      );
    }

    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// PATCH /api/admin/reports/:id/resolve - Mark report as resolved
router.patch("/reports/:id/resolve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run("UPDATE reports SET status = ? WHERE id = ?", ["resolved", id]);

    res.json({ message: "Report resolved successfully" });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ error: "Failed to resolve report" });
  }
});

// DELETE /api/admin/reports/:id - Delete a report
router.delete("/reports/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run("DELETE FROM reports WHERE id = ?", [id]);

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

module.exports = router;
