import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/session.route.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Error handler
app.use(errorHandler);

export default app;
