import { Router } from "express";

import {
  createBorrow,
  getMyBorrows,
  returnBook,
} from "../controllers/borrow.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/borrows - Borrow a book
router.post("/", verifyToken, createBorrow);

// GET /api/borrows - Get logged-in user's borrow history
router.get("/", verifyToken, getMyBorrows);

// DELETE /api/borrows/:id - Return a borrowed book
router.delete("/:id", verifyToken, returnBook);

export default router;
