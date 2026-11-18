import { Router } from "express";

import {
  createBorrow,
  getMyBorrows,
} from "../controllers/borrow.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/borrows (Protected)
router.post("/", verifyToken, createBorrow);

// GET /api/borrows (Protected)
router.get("/", verifyToken, getMyBorrows);

export default router;
