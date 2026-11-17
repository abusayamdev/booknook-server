import { Router } from "express";
import { getDatabase } from "../config/database.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const database = getDatabase();

    await database.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: "BookNook API is running successfully.",
      service: "BookNook Server",
      status: "healthy",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Database connection is unavailable.",
      service: "BookNook Server",
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

export default router;
