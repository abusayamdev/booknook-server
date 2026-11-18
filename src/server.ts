import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDatabase } from "./config/database.js";

import healthRoutes from "./routes/health.routes.js";
import bookRoutes from "./routes/book.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrows", borrowRoutes);

// Root Route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to BookNook API",
  });
});

// Start Server
async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`BookNook server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start BookNook server:", error);
    process.exit(1);
  }
}

void startServer();
