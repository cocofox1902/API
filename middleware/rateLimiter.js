const db = require("../config/database");

// Rate limiter désactivé - pas de limitation
const rateLimiter = async (req, res, next) => {
  // Limitation désactivée, passer directement à la suite
    next();
};

// Check if IP or deviceId is banned
const checkBannedIP = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const { deviceId } = req.body || {};

    const banned = await db.get(
      "SELECT * FROM banned_ips WHERE (ip IS NOT NULL AND ip = ?) OR (deviceid IS NOT NULL AND deviceid = ?)",
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
