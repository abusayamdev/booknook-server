import type { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";

import { getBooksCollection } from "../config/database.js";

// GET /api/books
// Get all books
export async function getAllBooks(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const booksCollection = getBooksCollection();

    const books = await booksCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Books retrieved successfully.",
      total: books.length,
      data: books,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/books/:id
// Get a single book
export async function getBookById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
      return;
    }

    const booksCollection = getBooksCollection();

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Book retrieved successfully.",
      data: book,
    });
  } catch (error) {
    next(error);
  }
}
