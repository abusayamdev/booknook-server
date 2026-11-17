import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "BookNook API is running successfully.",
    service: "BookNook Server",
    status: "healthy",
  });
});

export default router;
