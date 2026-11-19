import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDatabase } from "./config/database.js";

import healthRoutes from "./routes/health.routes.js";
import bookRoutes from "./routes/book.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { globalErrorHandler } from "./middleware/error.middleware.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(express.json({ limit: "1mb" }));

// Security HTTP headers
app.use(helmet());

// Allowed frontend origins
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (REST Client, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Parse JSON request bodies
app.use(express.json({ limit: "1mb" }));

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

let databaseConnection: Promise<void> | undefined;
if (process.env.VERCEL) {
  app.use(async (_req, _res, next) => {
    databaseConnection ??= connectDatabase()
      .then(() => undefined)
      .catch((error: unknown) => {
        databaseConnection = undefined;
        throw error;
      });

    await databaseConnection;
    next();
  });
}

// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrows", borrowRoutes);

// Handle unknown API routes
app.use(notFoundHandler);

// Handle all application errors
app.use(globalErrorHandler);

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

export default app;

if (!process.env.VERCEL) {
  void startServer();
}
