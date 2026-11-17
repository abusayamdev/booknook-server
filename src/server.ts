import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./routes/health.routes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/health", healthRoutes);

// Root Route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to BookNook API",
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`BookNook server running on port ${PORT}`);
});
