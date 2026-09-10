import pg from "pg";

const config = {
  host: process.env.DB_HOST || "localhost", // in Docker: 'db' (the service name)
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
  max: 10,
  idleTimeoutMillis: 30000,
};

export const pool = new pg.Pool(config);

// Create the table on startup so the app is self-bootstrapping
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ Database ready (table "messages" verified)');
}
