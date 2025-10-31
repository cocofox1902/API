const db = require("../config/database");

// Rate limiter: 10 submissions per heure par IP et deviceId
const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const { deviceId } = req.body || {};
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await db.run("DELETE FROM rate_limit WHERE timestamp < ?", [oneHourAgo]);

    const result = await db.get(
      "SELECT COUNT(*) as count FROM rate_limit WHERE ip = ? AND timestamp > ?",
      [ip, oneHourAgo]
    );

    const deviceResult = deviceId
      ? await db.get(
          "SELECT COUNT(*) as count FROM rate_limit WHERE deviceId = ? AND timestamp > ?",
          [deviceId, oneHourAgo]
        )
      : { count: 0 };

    if (result.count >= 10 || deviceResult.count >= 10) {
      return res.status(429).json({
        error: "Rate limit exceeded. Maximum 10 submissions par heure.",
      });
    }

    await db.run("INSERT INTO rate_limit (ip, deviceId) VALUES (?, ?)", [
      ip,
      deviceId || null,
    ]);

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next();
  }
};

// Check if IP or deviceId is banned
const checkBannedIP = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const { deviceId } = req.body || {};

    const banned = await db.get(
      "SELECT * FROM banned_ips WHERE (ip IS NOT NULL AND ip = ?) OR (deviceId IS NOT NULL AND deviceId = ?)",
      [ip, deviceId || null]
    );

    if (banned) {
      return res.status(403).json({
        error: "Access denied",
        reason: banned.reason,
      });
    }

    next();
  } catch (error) {
    console.error("IP/device ban check error:", error);
    next();
  }
};

module.exports = { rateLimiter, checkBannedIP };
