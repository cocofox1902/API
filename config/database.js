const { Pool } = require("pg");

// PostgreSQL adapter that converts ? placeholders to $1, $2, etc.
class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    this.pool.on("connect", () => {
      console.log("Connected to PostgreSQL database");
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });

    this.initTables();
  }

  // Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
  convertQuery(sql, params) {
    let index = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${index++}`);
    return { sql: convertedSql, params };
  }

  async initTables() {
    const client = await this.pool.connect();
    try {
      // Bars table
      await client.query(`
        CREATE TABLE IF NOT EXISTS bars (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          regularPrice REAL NOT NULL,
          happyHourPrice REAL,
          happyHourStart TEXT,
          happyHourEnd TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          submittedByIP TEXT,
          deviceId TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Banned IPs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS banned_ips (
          id SERIAL PRIMARY KEY,
          ip TEXT,
          deviceId TEXT,
          reason TEXT,
          bannedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Admin users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          twoFactorSecret TEXT,
          twoFactorEnabled BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rate limit tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limit (
          id SERIAL PRIMARY KEY,
          ip TEXT,
          deviceId TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          barId INTEGER NOT NULL,
          reason TEXT NOT NULL,
          reportedByIP TEXT,
          deviceId TEXT,
          reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved')),
          FOREIGN KEY (barId) REFERENCES bars(id) ON DELETE CASCADE
        )
      `);

      console.log("Database tables initialized");
    } catch (err) {
      console.error("Error initializing tables:", err);
    } finally {
      client.release();
    }

    try {
      await this.pool.query(`
        ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT FALSE
      `);
      console.log("✅ twoFactorEnabled column ensured");
    } catch (err) {
      console.log(
        "ℹ️  twoFactorEnabled column already exists or error:",
        err.message
      );
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars ADD COLUMN IF NOT EXISTS deviceId TEXT
      `);
      console.log("✅ bars.deviceId column ensured");
    } catch (err) {
      console.log(
        "ℹ️  bars.deviceId column already exists or error:",
        err.message
      );
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await this.pool.query(
        `UPDATE bars SET createdAt = NOW() WHERE createdAt IS NULL`
      );
      console.log("✅ bars.createdAt column ensured");
    } catch (err) {
      console.log("ℹ️  bars.createdAt column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS deviceId TEXT
      `);
      console.log("✅ reports.deviceId column ensured");
    } catch (err) {
      console.log(
        "ℹ️  reports.deviceId column already exists or error:",
        err.message
      );
    }

    try {
      await this.pool.query(`
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await this.pool.query(
        `UPDATE reports SET reportedAt = NOW() WHERE reportedAt IS NULL`
      );
      console.log("✅ reports.reportedAt column ensured");
    } catch (err) {
      console.log("ℹ️  reports.reportedAt column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS deviceId TEXT
      `);
      console.log("✅ banned_ips.deviceId column ensured");
    } catch (err) {
      console.log(
        "ℹ️  banned_ips.deviceId column already exists or error:",
        err.message
      );
    }

    try {
      await this.pool.query(`
        ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS id SERIAL
      `);
      await this.pool.query(`
        UPDATE banned_ips SET id = nextval('banned_ips_id_seq') WHERE id IS NULL
      `);
      console.log("✅ banned_ips.id column ensured");
    } catch (err) {
      console.log("ℹ️  banned_ips.id column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE banned_ips ADD COLUMN IF NOT EXISTS bannedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      await this.pool.query(
        `UPDATE banned_ips SET bannedAt = NOW() WHERE bannedAt IS NULL`
      );
      console.log("✅ banned_ips.bannedAt column ensured");
    } catch (err) {
      console.log("ℹ️  banned_ips.bannedAt column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE rate_limit ADD COLUMN IF NOT EXISTS deviceId TEXT
      `);
      console.log("✅ rate_limit.deviceId column ensured");
    } catch (err) {
      console.log(
        "ℹ️  rate_limit.deviceId column already exists or error:",
        err.message
      );
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars RENAME COLUMN "happyHourPrice" TO happyhourprice
      `);
      console.log("✅ bars.happyhourprice column normalized");
    } catch (err) {
      if (!err.message.includes("does not exist")) {
        console.log(
          "ℹ️  bars.happyHourPrice rename skipped or error:",
          err.message
        );
      }
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars ADD COLUMN IF NOT EXISTS happyhourprice REAL
      `);
      console.log("✅ bars.happyhourprice column ensured");
    } catch (err) {
      console.log("ℹ️  bars.happyhourprice column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars RENAME COLUMN "happyHourStart" TO happyhourstart
      `);
      console.log("✅ bars.happyhourstart column normalized");
    } catch (err) {
      if (!err.message.includes("does not exist")) {
        console.log(
          "ℹ️  bars.happyHourStart rename skipped or error:",
          err.message
        );
      }
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars RENAME COLUMN "happyHourEnd" TO happyhourend
      `);
      console.log("✅ bars.happyhourend column normalized");
    } catch (err) {
      if (!err.message.includes("does not exist")) {
        console.log(
          "ℹ️  bars.happyHourEnd rename skipped or error:",
          err.message
        );
      }
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars ADD COLUMN IF NOT EXISTS happyhourstart TEXT
      `);
      console.log("✅ bars.happyhourstart column ensured");
    } catch (err) {
      console.log("ℹ️  bars.happyhourstart column ensure error:", err.message);
    }

    try {
      await this.pool.query(`
        ALTER TABLE bars ADD COLUMN IF NOT EXISTS happyhourend TEXT
      `);
      console.log("✅ bars.happyhourend column ensured");
    } catch (err) {
      console.log("ℹ️  bars.happyhourend column ensure error:", err.message);
    }
  }

  async run(sql, params = []) {
    const { sql: convertedSql, params: convertedParams } = this.convertQuery(
      sql,
      params
    );
    const client = await this.pool.connect();
    try {
      const result = await client.query(convertedSql, convertedParams);
      return {
        id: result.rows[0]?.id,
        changes: result.rowCount,
      };
    } finally {
      client.release();
    }
  }

  async get(sql, params = []) {
    const { sql: convertedSql, params: convertedParams } = this.convertQuery(
      sql,
      params
    );
    const client = await this.pool.connect();
    try {
      const result = await client.query(convertedSql, convertedParams);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async all(sql, params = []) {
    const { sql: convertedSql, params: convertedParams } = this.convertQuery(
      sql,
      params
    );
    const client = await this.pool.connect();
    try {
      const result = await client.query(convertedSql, convertedParams);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();
