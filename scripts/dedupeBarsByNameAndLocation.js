/**
 * ONE-TIME / MAINTENANCE: remove duplicate bars with the same name and location.
 *
 * "Same address" = same coordinates (rounded to 6 decimals ~10cm) + same name
 * (trimmed, case-insensitive). Keeps the row with the smallest `id` per group;
 * deletes the others (reports CASCADE).
 *
 * Usage:
 *   npm run dedupe:bars
 *   DATABASE_URL=... node scripts/dedupeBarsByNameAndLocation.js
 *
 * Dry run (no deletes):
 *   DEDUPE_DRY_RUN=true npm run dedupe:bars
 */

require("dotenv").config();
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
    console.error("DATABASE_URL is required (see .env)");
    process.exit(1);
  }

  const dryRun =
    process.env.DEDUPE_DRY_RUN === "true" || process.env.DEDUPE_DRY_RUN === "1";

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(),
  });

  const client = await pool.connect();
  try {
    const dupCount = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM (
        SELECT 1
        FROM bars
        GROUP BY LOWER(TRIM(name)),
                 ROUND(latitude::numeric, 6),
                 ROUND(longitude::numeric, 6)
        HAVING COUNT(*) > 1
      ) t;
    `);
    const groupsWithDups = Number(dupCount.rows[0]?.cnt || 0);

    const idsToRemove = await client.query(`
      SELECT id, name, latitude, longitude
      FROM (
        SELECT
          id,
          name,
          latitude,
          longitude,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)),
                         ROUND(latitude::numeric, 6),
                         ROUND(longitude::numeric, 6)
            ORDER BY id ASC
          ) AS rn
        FROM bars
      ) ranked
      WHERE rn > 1
      ORDER BY id;
    `);

    const toDelete = idsToRemove.rows;
    console.log(`Duplicate groups (name + lat/lng): ${groupsWithDups}`);
    console.log(`Rows that would be removed (keeping lowest id per group): ${toDelete.length}`);

    if (toDelete.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    if (dryRun) {
      console.log("\nDEDUPE_DRY_RUN=true — no rows deleted. Example ids:", toDelete.slice(0, 15).map((r) => r.id).join(", "));
      return;
    }

    await client.query("BEGIN");
    const del = await client.query(
      `
      DELETE FROM bars
      WHERE id IN (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(TRIM(name)),
                           ROUND(latitude::numeric, 6),
                           ROUND(longitude::numeric, 6)
              ORDER BY id ASC
            ) AS rn
          FROM bars
        ) ranked
        WHERE rn > 1
      )
      RETURNING id, name, latitude, longitude;
    `
    );
    await client.query("COMMIT");

    console.log(`\nDeleted ${del.rowCount} duplicate bar(s).`);
    if (del.rows.length <= 30) {
      del.rows.forEach((r) =>
        console.log(`  - id ${r.id} | ${r.name} @ ${r.latitude}, ${r.longitude}`)
      );
    } else {
      console.log(`  (first 10) ${del.rows
        .slice(0, 10)
        .map((r) => r.id)
        .join(", ")} …`);
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
