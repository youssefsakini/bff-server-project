import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const FINAL_SERVER_URL =
  process.env.FINAL_SERVER_URL || "http://localhost:3002";
export const BACKEND_SERVER_URL =
  process.env.BACKEND_SERVER_URL || "http://localhost:5004/api/v1";

// Redis configuration
export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = process.env.REDIS_PORT || 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
export const REDIS_DB = process.env.REDIS_DB || 0;

// external APIs
export const COUNTRIES_API_URL = process.env.COUNTRIES_API_URL;
export const CITIES_API_URL = process.env.CITIES_API_URL;
export const CAR_BRANDS_API_URL = process.env.CAR_BRANDS_API_URL;
export const CAR_MODELS_API_URL = process.env.CAR_MODELS_API_URL;
