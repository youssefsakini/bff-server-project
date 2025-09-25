import redisClient from "./config/redis.js";

async function testConnection() {
  try {
    // Test connection
    await redisClient.ping();
    console.log("✅ Successfully connected to Redis");

    // Test basic operations
    await redisClient.set("test:connection", "success");
    const result = await redisClient.get("test:connection");
    console.log("✅ Basic operation test:", result);

    // Cleanup
    await redisClient.del("test:connection");

    console.log("✅ Redis connection test completed successfully");
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error.message);
  } finally {
    await redisClient.quit();
  }
}

testConnection();
