import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "bff_db",
  user: process.env.DB_USER || "bff_user",
  password: process.env.DB_PASSWORD || "bff_password123",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export default pool;
