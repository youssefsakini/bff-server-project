import { pool } from "./config/database.js";

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log("✅ Successfully connected to PostgreSQL database");

    // Test query
    const result = await client.query("SELECT NOW() as current_time");
    console.log("✅ Current database time:", result.rows[0].current_time);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log(
      "✅ Available tables:",
      tablesResult.rows.map((row) => row.table_name)
    );
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
