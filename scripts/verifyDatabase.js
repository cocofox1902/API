/**
 * Quick check: can Node connect to Postgres with DATABASE_URL?
 * Usage: from API folder, with .env loaded:
 *   node scripts/verifyDatabase.js
 */
require("dotenv").config();

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
    console.error("❌ DATABASE_URL is missing. Copy .env.example → .env and set it.");
    process.exit(1);
  }

  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(),
  });

  try {
    const r = await pool.query(
      "SELECT current_database() AS db, COUNT(*)::int AS bar_count FROM public.bars"
    );
    const row = r.rows[0];
    console.log("✅ Connected to database:", row.db);
    console.log("   Table public.bars exists — row count:", row.bar_count);
    console.log("   Next: if count is 0, run npm run seed:bars (optionally CLEAR_BARS_BEFORE_SEED=true).");
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("does not exist")) {
      console.error(
        "❌ Table public.bars not found. Run supabase/migrations/001_init.sql in Supabase SQL Editor."
      );
    } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
      console.error("❌ DNS could not resolve the database host (ENOTFOUND).");
      console.error("   Fix:");
      console.error("   1) Supabase → Project Settings → Database → copy the URI again (host must match your project).");
      console.error("   2) Compare Project Settings → General → Reference ID with the host: db.<REF>.supabase.co");
      console.error("   3) Try: ping db.<your-ref>.supabase.co  (if ping fails, typo or offline DNS).");
      console.error("   4) If direct connection fails on your network, use Session pooler URI (IPv4) from the same Database page.");
    } else {
      console.error("❌ Connection/query failed:", msg);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
