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
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          submittedByIP TEXT
        )
      `);

      // Banned IPs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS banned_ips (
          ip TEXT PRIMARY KEY,
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
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rate limit tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limit (
          ip TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ip, timestamp)
        )
      `);

      console.log("Database tables initialized");
    } catch (err) {
      console.error("Error initializing tables:", err);
    } finally {
      client.release();
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
