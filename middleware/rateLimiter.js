const db = require("../config/database");

// Rate limiter: 10 submissions per hour per IP
const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Clean old rate limit entries
    await db.run("DELETE FROM rate_limit WHERE timestamp < ?", [oneHourAgo]);

    // Count recent submissions from this IP
    const result = await db.get(
      "SELECT COUNT(*) as count FROM rate_limit WHERE ip = ? AND timestamp > ?",
      [ip, oneHourAgo]
    );

    if (result.count >= 10) {
      return res.status(429).json({
        error: "Rate limit exceeded. Maximum 10 submissions per hour.",
      });
    }

    // Log this request
    await db.run("INSERT INTO rate_limit (ip) VALUES (?)", [ip]);

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next();
  }
};

// Check if IP is banned
const checkBannedIP = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;

    const banned = await db.get("SELECT * FROM banned_ips WHERE ip = ?", [ip]);

    if (banned) {
      return res.status(403).json({
        error: "Your IP has been banned",
        reason: banned.reason,
      });
    }

    next();
  } catch (error) {
    console.error("IP ban check error:", error);
    next();
  }
};

module.exports = { rateLimiter, checkBannedIP };
