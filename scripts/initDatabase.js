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

    console.log("ℹ️  Sample bar seeding skipped (production data only)");

    console.log("✅ Database initialized successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();
