import { Router } from "express";

import { getAllBooks, getBookById } from "../controllers/book.controller.js";

const router = Router();

// Get all books
router.get("/", getAllBooks);

// Get book by ID
router.get("/:id", getBookById);

export default router;
