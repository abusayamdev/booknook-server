import { Router } from "express";

import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/book.controller.js";

import {
  verifyToken,
  optionalVerifyToken,
} from "../middleware/auth.middleware.js";

const router = Router();

// Public books + optional authentication for My Books
router.get("/", optionalVerifyToken, getAllBooks);

// Get single book
router.get("/:id", getBookById);

// Create book
router.post("/", verifyToken, createBook);

// Update book
router.patch("/:id", verifyToken, updateBook);

// Delete book
router.delete("/:id", verifyToken, deleteBook);

export default router;
