import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/session.route.js";
import productRoutes from "./routes/product.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
app.use(errorHandler);

// Middleware
app.use(
  cors({
    origin: "http://localhost:4200", // Angular dev server
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/session", sessionRoutes);
app.use("/api/products", productRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || null,
    });
  }

  console.error("Unhandled Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

export default app;
