import { Router } from "express";

import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
} from "../controllers/book.controller.js";

import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/books
router.get("/", getAllBooks);

// GET /api/books/:id
router.get("/:id", getBookById);

// POST /api/books (Protected)
router.post("/", verifyToken, createBook);

// PATCH /api/books/:id (Protected)
router.patch("/:id", verifyToken, updateBook);

export default router;
