const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { rateLimiter, checkBannedIP } = require("../middleware/rateLimiter");

/**
 * Map a DB row (lowercase keys from node-pg) to bar_final.json item shape.
 */
function toBarFinalRow(row) {
  const lat = row.latitude != null ? Number(row.latitude) : null;
  const lng = row.longitude != null ? Number(row.longitude) : null;
  const hh = row.happyhourprice;
  // node-pg : BIGINT souvent string ou BigInt → forcer un nombre JSON pour les clients (ex. iOS)
  const idRaw = row.id;
  const idNum =
    idRaw == null || idRaw === ""
      ? null
      : typeof idRaw === "bigint"
        ? Number(idRaw)
        : Number.parseInt(String(idRaw), 10);
  return {
    id: idNum != null && Number.isFinite(idNum) ? idNum : null,
    name: row.name,
    location:
      lat != null && lng != null
        ? { latitude: lat, longitude: lng }
        : { latitude: null, longitude: null },
    prixPinte:
      row.regularprice != null ? Number(row.regularprice) : row.regularprice,
    prixPinteHappyHour:
      hh === null || hh === undefined ? null : Number(hh),
    startHappyHour: row.happyhourstart ?? null,
    endHappyHour: row.happyhourend ?? null,
  };
}

function asNumberOrUndefined(v) {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Normalize POST body: supports flat fields or bar_final-style nested fields.
 */
function normalizeBarSubmission(body) {
  const {
    name,
    latitude,
    longitude,
    regularPrice,
    happyHourPrice,
    prixPinte,
    prixPinteHappyHour,
    startHappyHour,
    endHappyHour,
    location,
    deviceId,
  } = body;

  const latRaw =
    latitude != null
      ? latitude
      : location != null && typeof location === "object"
        ? location.latitude
        : undefined;
  const lngRaw =
    longitude != null
      ? longitude
      : location != null && typeof location === "object"
        ? location.longitude
        : undefined;
  const priceRaw =
    regularPrice != null
      ? regularPrice
      : prixPinte != null
        ? prixPinte
        : undefined;
  const hhRaw =
    happyHourPrice !== undefined
      ? happyHourPrice
      : prixPinteHappyHour !== undefined
        ? prixPinteHappyHour
        : undefined;

  const lat = asNumberOrUndefined(latRaw);
  const lng = asNumberOrUndefined(lngRaw);
  const price = asNumberOrUndefined(priceRaw);
  let hh = null;
  if (hhRaw === null) hh = null;
  else if (hhRaw === undefined) hh = undefined;
  else {
    const n = asNumberOrUndefined(hhRaw);
    hh = n === undefined ? hhRaw : n;
  }

  return {
    name,
    latitude: lat,
    longitude: lng,
    regularPrice: price,
    happyHourPrice: hh,
    startHappyHour:
      startHappyHour != null ? String(startHappyHour) : null,
    endHappyHour: endHappyHour != null ? String(endHappyHour) : null,
    deviceId,
  };
}

// GET /api/bars - Get all approved bars (bar_final.json envelope + shape)
router.get("/", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM bars WHERE status = ?", [
      "approved",
    ]);
    const bars = rows.map(toBarFinalRow);
    res.json({ bars });
  } catch (error) {
    console.error("Error fetching bars:", error);
    res.status(500).json({ error: "Failed to fetch bars" });
  }
});

// POST /api/bars - Submit a new bar (with rate limiting and IP ban check)
router.post("/", checkBannedIP, rateLimiter, async (req, res) => {
  try {
    const normalized = normalizeBarSubmission(req.body);
    const {
      name,
      latitude,
      longitude,
      regularPrice,
      happyHourPrice,
      startHappyHour,
      endHappyHour,
      deviceId,
    } = normalized;

    // Validation
    if (!name || latitude == null || longitude == null || regularPrice == null) {
      return res.status(400).json({
        error:
          "Missing required fields: name, latitude, longitude, and regularPrice (or prixPinte / location)",
      });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof regularPrice !== "number"
    ) {
      return res.status(400).json({
        error:
          "latitude, longitude, and regularPrice (or prixPinte) must be numbers",
      });
    }

    if (
      happyHourPrice !== null &&
      happyHourPrice !== undefined &&
      typeof happyHourPrice !== "number"
    ) {
      return res.status(400).json({
        error: "happyHourPrice / prixPinteHappyHour must be a number or null",
      });
    }

    const ip = req.clientIp || req.ip;
    req.deviceId = deviceId;

    const result = await db.run(
      "INSERT INTO bars (name, latitude, longitude, regularprice, happyhourprice, happyhourstart, happyhourend, status, submittedbyip, deviceid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [
        typeof name === "string" ? name.trim() : name,
        latitude,
        longitude,
        regularPrice,
        happyHourPrice == null ? null : happyHourPrice,
        startHappyHour,
        endHappyHour,
        "pending",
        ip,
        deviceId || null,
      ]
    );

    res.status(201).json({
      message: "Bar submitted successfully",
      id: result.id,
    });
  } catch (error) {
    console.error("Error creating bar:", error);
    res.status(500).json({ error: "Failed to submit bar" });
  }
});

// POST /api/bars/:id/report - Report a bar (with rate limiting)
router.post("/:id/report", checkBannedIP, rateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deviceId } = req.body;

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Reason is required" });
    }

    if (reason.length > 500) {
      return res
        .status(400)
        .json({ error: "Reason is too long (max 500 characters)" });
    }

    // Check if bar exists
    const bar = await db.get("SELECT id FROM bars WHERE id = ?", [id]);
    if (!bar) {
      return res.status(404).json({ error: "Bar not found" });
    }

    const ip = req.clientIp || req.ip;
    req.deviceId = deviceId;

    // Insert report
    const result = await db.run(
      "INSERT INTO reports (barid, reason, reportedbyip, deviceid) VALUES (?, ?, ?, ?) RETURNING id",
      [id, reason.trim(), ip, deviceId || null]
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
