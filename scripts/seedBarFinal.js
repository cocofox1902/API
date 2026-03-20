/**
 * Seed bars from bar_final.json into Postgres (e.g. Supabase).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seedBarFinal.js
 *   CLEAR_BARS_BEFORE_SEED=true npm run seed:bars
 *
 * Requires tables from supabase/migrations/001_init.sql (or RUN_API_DDL local schema).
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function resolveSsl() {
  if (process.env.DATABASE_SSL === "false" || process.env.DATABASE_SSL === "0") {
    return false;
  }
  const url = process.env.DATABASE_URL || "";
  if (url.includes("supabase.co")) {
    return { rejectUnauthorized: false };
  }
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }
  if (process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1") {
    return { rejectUnauthorized: false };
  }
  return false;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (see .env.example)");
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, "..", "bar_final.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.bars)) {
    console.error("bar_final.json must contain a top-level { bars: [...] } array");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(),
  });

  const client = await pool.connect();
  try {
    if (process.env.CLEAR_BARS_BEFORE_SEED === "true") {
      await client.query("TRUNCATE TABLE bars RESTART IDENTITY CASCADE");
      console.log("Cleared bars (and dependent reports) before seed.");
    }

    let inserted = 0;
    for (const b of data.bars) {
      if (!b.name || !b.location) {
        console.warn("Skipping invalid entry (missing name or location):", b.name);
        continue;
      }
      const lat = b.location.latitude;
      const lng = b.location.longitude;
      if (lat == null || lng == null) {
        console.warn("Skipping bar with missing coordinates:", b.name);
        continue;
      }

      await client.query(
        `INSERT INTO bars (
          name, latitude, longitude, regularprice, happyhourprice,
          happyhourstart, happyhourend, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')`,
        [
          b.name,
          lat,
          lng,
          b.prixPinte,
          b.prixPinteHappyHour == null ? null : b.prixPinteHappyHour,
          b.startHappyHour ?? null,
          b.endHappyHour ?? null,
        ]
      );
      inserted++;
    }

    console.log(`Seeded ${inserted} bars from bar_final.json`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
