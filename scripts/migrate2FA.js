const db = require("../config/database");

async function migrate() {
  console.log("🔄 Starting 2FA migration...");

  try {
    // Add twoFactorSecret column
    await db.run(`
      ALTER TABLE admin_users 
      ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT
    `);
    console.log("✅ Added twoFactorSecret column");

    // Add twoFactorEnabled column
    await db.run(`
      ALTER TABLE admin_users 
      ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT FALSE
    `);
    console.log("✅ Added twoFactorEnabled column");

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
