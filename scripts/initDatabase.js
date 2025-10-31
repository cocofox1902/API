const bcrypt = require("bcrypt");
const db = require("../config/database");

async function initDatabase() {
  try {
    console.log("Initializing database...");

    // Migrate 2FA columns if they don't exist
    console.log("🔄 Checking 2FA migration...");
    try {
      await db.run(`
        ALTER TABLE admin_users 
        ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT
      `);
      console.log("✅ twoFactorSecret column ensured");
    } catch (err) {
      console.log(
        "ℹ️  twoFactorSecret column already exists or error:",
        err.message
      );
    }

    try {
      await db.run(`
        ALTER TABLE admin_users 
        ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT FALSE
      `);
      console.log("✅ twoFactorEnabled column ensured");
    } catch (err) {
      console.log(
        "ℹ️  twoFactorEnabled column already exists or error:",
        err.message
      );
    }

    // Create default admin user (username: admin, password: admin)
    const hashedPassword = await bcrypt.hash("admin", 10);

    try {
      await db.run(
        "INSERT INTO admin_users (username, password) VALUES (?, ?)",
        ["admin", hashedPassword]
      );
      console.log(
        "✅ Default admin user created (username: admin, password: admin)"
      );
    } catch (err) {
      // PostgreSQL error code 23505 = unique constraint violation
      // SQLite error message includes "UNIQUE"
      if (err.code === "23505" || err.message.includes("UNIQUE")) {
        console.log("ℹ️  Admin user already exists");
      } else {
        throw err;
      }
    }

    try {
      await db.run(`
        ALTER TABLE bars 
        ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await db.run(`UPDATE bars SET createdAt = CURRENT_TIMESTAMP WHERE createdAt IS NULL`);
      console.log("✅ bars.createdAt column ensured");
    } catch (err) {
      console.log("ℹ️  bars.createdAt ensure skipped:", err.message);
    }

    try {
      await db.run(`
        ALTER TABLE reports 
        ADD COLUMN IF NOT EXISTS reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await db.run(`UPDATE reports SET reportedAt = CURRENT_TIMESTAMP WHERE reportedAt IS NULL`);
      console.log("✅ reports.reportedAt column ensured");
    } catch (err) {
      console.log("ℹ️  reports.reportedAt ensure skipped:", err.message);
    }

    try {
      await db.run(`
        ALTER TABLE banned_ips 
        ADD COLUMN IF NOT EXISTS id SERIAL
      `);
      await db.run(
        `UPDATE banned_ips SET id = nextval('banned_ips_id_seq') WHERE id IS NULL`
      );
      console.log("✅ banned_ips.id column ensured");
    } catch (err) {
      console.log("ℹ️  banned_ips.id ensure skipped:", err.message);
    }

    try {
      await db.run(`
        ALTER TABLE banned_ips 
        ADD COLUMN IF NOT EXISTS bannedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await db.run(
        `UPDATE banned_ips SET bannedAt = CURRENT_TIMESTAMP WHERE bannedAt IS NULL`
      );
      console.log("✅ banned_ips.bannedAt column ensured");
    } catch (err) {
      console.log("ℹ️  banned_ips.bannedAt ensure skipped:", err.message);
    }

    try {
      await db.run(`DELETE FROM banned_ips`);
      console.log("✅ Existing banned entries cleared");
    } catch (err) {
      console.log("ℹ️  Unable to clear banned entries:", err.message);
    }

    console.log("ℹ️  Sample bar seeding skipped (production data only)");

    console.log("✅ Database initialized successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();
