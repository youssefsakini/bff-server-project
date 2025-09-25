import Redis from "redis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } from "./config.js";

const redisClient = Redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  password: REDIS_PASSWORD,
  database: REDIS_DB,
});

// Error handling
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redisClient.on("ready", () => {
  console.log("✅ Redis client is ready");
});

// Connect to Redis
await redisClient.connect();
await redisClient.set("greeting", "Hello, Redis!");
const value = await redisClient.get("greeting");

console.log("Greeting from Redis:", value);

export default redisClient;
