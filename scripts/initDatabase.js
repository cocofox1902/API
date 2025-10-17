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

    // Add test bars
    console.log("Adding test bars...");

    // 2 approved bars
    const approvedBars = [
      {
        name: "Le Café des Sports",
        latitude: 48.8566,
        longitude: 2.3522,
        regularPrice: 4.5,
        status: "approved",
      },
      {
        name: "Bar du Marché",
        latitude: 48.8584,
        longitude: 2.3447,
        regularPrice: 3.8,
        status: "approved",
      },
    ];

    // 1 pending bar
    const pendingBar = {
      name: "New Bar Pending Review",
      latitude: 48.8606,
      longitude: 2.3376,
      regularPrice: 5.2,
      status: "pending",
    };

    for (const bar of approvedBars) {
      try {
        await db.run(
          "INSERT INTO bars (name, latitude, longitude, regularPrice, status, submittedByIP) VALUES (?, ?, ?, ?, ?, ?)",
          [
            bar.name,
            bar.latitude,
            bar.longitude,
            bar.regularPrice,
            bar.status,
            "127.0.0.1",
          ]
        );
        console.log(`✅ Added approved bar: ${bar.name}`);
      } catch (err) {
        console.log(`ℹ️  Bar already exists: ${bar.name}`);
      }
    }

    try {
      await db.run(
        "INSERT INTO bars (name, latitude, longitude, regularPrice, status, submittedByIP) VALUES (?, ?, ?, ?, ?, ?)",
        [
          pendingBar.name,
          pendingBar.latitude,
          pendingBar.longitude,
          pendingBar.regularPrice,
          pendingBar.status,
          "192.168.1.100",
        ]
      );
      console.log(`✅ Added pending bar: ${pendingBar.name}`);
    } catch (err) {
      console.log(`ℹ️  Bar already exists: ${pendingBar.name}`);
    }

    console.log("✅ Database initialized successfully with test data");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();
