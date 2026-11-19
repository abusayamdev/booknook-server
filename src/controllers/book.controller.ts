import type { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";

import { getBooksCollection } from "../config/database.js";
import { createBookSchema, updateBookSchema } from "../schemas/book.schema.js";
import type { BookDocument } from "../types/book.types.js";

// ============================================
// GET /api/books
// Get all books or authenticated user's books
// ============================================

export async function getAllBooks(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const booksCollection = getBooksCollection();

    const mine = req.query.mine === "true";

    // Private owner filtering
    if (mine && !req.user) {
      res.status(401).json({
        success: false,
        message: "Please login to view your books.",
      });
      return;
    }

    const filter = mine ? { "addedBy.email": req.user!.email } : {};

    const books = await booksCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: mine
        ? "Your books retrieved successfully."
        : "Books retrieved successfully.",
      total: books.length,
      data: books,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /api/books/:id
// Get a single book
// ============================================

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

// ============================================
// POST /api/books
// Create a new book
// ============================================

export async function createBook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to add a book.",
      });
      return;
    }

    const validation = createBookSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Book validation failed.",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const booksCollection = getBooksCollection();
    const now = new Date();

    const book = {
      ...validation.data,
      addedBy: {
        name: req.user.name,
        email: req.user.email,
      },
      availableCopies: validation.data.totalCopies,
      createdAt: now,
      updatedAt: now,
    };

    const result = await booksCollection.insertOne(book);

    const createdBook = await booksCollection.findOne({
      _id: result.insertedId,
    });

    res.status(201).json({
      success: true,
      message: "Book added successfully.",
      data: createdBook,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// PATCH /api/books/:id
// Update an existing book
// ============================================

export async function updateBook(
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

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to update a book.",
      });
      return;
    }

    const validation = updateBookSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Book update validation failed.",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const booksCollection = getBooksCollection();
    const bookId = new ObjectId(id);

    const existingBook = await booksCollection.findOne({
      _id: bookId,
    });

    if (!existingBook) {
      res.status(404).json({
        success: false,
        message: "Book not found.",
      });
      return;
    }

    // Only the original contributor can update this book
    if (existingBook.addedBy.email !== req.user.email) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this book.",
      });
      return;
    }

    const updateData = validation.data;

    // Calculate currently borrowed copies
    const borrowedCopies =
      existingBook.totalCopies - existingBook.availableCopies;

    // Do not allow total copies below borrowed copies
    if (
      updateData.totalCopies !== undefined &&
      updateData.totalCopies < borrowedCopies
    ) {
      res.status(400).json({
        success: false,
        message: "Total copies cannot be less than borrowed copies.",
      });
      return;
    }

    const updatedFields: Partial<BookDocument> = {
      updatedAt: new Date(),
    };

    // Add only defined fields
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        Object.assign(updatedFields, {
          [key]: value,
        });
      }
    }

    // Preserve borrowed copies when total copies change
    if (updateData.totalCopies !== undefined) {
      updatedFields.availableCopies = updateData.totalCopies - borrowedCopies;
    }

    // Update only if ownership and copy counts remain unchanged
    const result = await booksCollection.updateOne(
      {
        _id: bookId,
        "addedBy.email": req.user.email,
        totalCopies: existingBook.totalCopies,
        availableCopies: existingBook.availableCopies,
      },
      {
        $set: updatedFields,
      },
    );

    if (result.matchedCount === 0) {
      res.status(409).json({
        success: false,
        message: "Book data changed. Please refresh and try again.",
      });
      return;
    }

    const updatedBook = await booksCollection.findOne({
      _id: bookId,
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      data: updatedBook,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// DELETE /api/books/:id
// Delete an existing book
// ============================================

export async function deleteBook(
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

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to delete a book.",
      });
      return;
    }

    const booksCollection = getBooksCollection();
    const bookId = new ObjectId(id);

    const existingBook = await booksCollection.findOne({
      _id: bookId,
    });

    if (!existingBook) {
      res.status(404).json({
        success: false,
        message: "Book not found.",
      });
      return;
    }

    // Only the original contributor can delete this book
    if (existingBook.addedBy.email !== req.user.email) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to delete this book.",
      });
      return;
    }

    // Prevent deletion while books are borrowed
    if (existingBook.availableCopies !== existingBook.totalCopies) {
      res.status(409).json({
        success: false,
        message: "This book cannot be deleted while copies are borrowed.",
        totalCopies: existingBook.totalCopies,
        availableCopies: existingBook.availableCopies,
      });
      return;
    }

    const result = await booksCollection.deleteOne({
      _id: bookId,
      "addedBy.email": req.user.email,
      totalCopies: existingBook.totalCopies,
      availableCopies: existingBook.availableCopies,
    });

    if (result.deletedCount === 0) {
      res.status(409).json({
        success: false,
        message: "Book data changed. Please refresh and try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
      data: {
        id: bookId.toString(),
        title: existingBook.title,
      },
    });
  } catch (error) {
    next(error);
  }
}
