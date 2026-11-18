import type { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";

import { getBooksCollection } from "../config/database.js";
import { createBookSchema } from "../schemas/book.schema.js";
import { updateBookSchema } from "../schemas/book.schema.js";
import type { BookDocument } from "../types/book.types.js";

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



export async function createBook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const validation = createBookSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Book validation failed.",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to add a book.",
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



export async function updateBook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
      return;
    }

    // Require authenticated user
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to update a book.",
      });
      return;
    }

    // Validate request body
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

    // Find existing book
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

    // Check book ownership
    if (existingBook.addedBy.email !== req.user.email) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this book.",
      });
      return;
    }

    const updateData = validation.data;

    // Keep borrowed copies unchanged when total copies are updated
    if (updateData.totalCopies !== undefined) {
      const borrowedCopies =
        existingBook.totalCopies - existingBook.availableCopies;

      if (updateData.totalCopies < borrowedCopies) {
        res.status(400).json({
          success: false,
          message: "Total copies cannot be less than borrowed copies.",
        });
        return;
      }
    }

   
const updatedFields: Partial<BookDocument> = {
  updatedAt: new Date(),
};

// Add only defined values to the update object
for (const [key, value] of Object.entries(updateData)) {
  if (value !== undefined) {
    Object.assign(updatedFields, {
      [key]: value,
    });
  }
}

if (updateData.totalCopies !== undefined) {
  const borrowedCopies =
    existingBook.totalCopies - existingBook.availableCopies;

  updatedFields.availableCopies = updateData.totalCopies - borrowedCopies;
}


    if (updateData.totalCopies !== undefined) {
      const borrowedCopies =
        existingBook.totalCopies - existingBook.availableCopies;

      Object.assign(updatedFields, {
        availableCopies: updateData.totalCopies - borrowedCopies,
      });
    }

    // Update only if the book's copy counts have not changed meanwhile
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



export async function deleteBook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
      return;
    }

    // Require authenticated user
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to delete a book.",
      });
      return;
    }

    const booksCollection = getBooksCollection();
    const bookId = new ObjectId(id);

    // Find existing book
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

    // Check book ownership
    if (existingBook.addedBy.email !== req.user.email) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to delete this book.",
      });
      return;
    }

    // Prevent deletion while copies are borrowed
    if (existingBook.availableCopies !== existingBook.totalCopies) {
      res.status(409).json({
        success: false,
        message: "This book cannot be deleted while copies are borrowed.",
        totalCopies: existingBook.totalCopies,
        availableCopies: existingBook.availableCopies,
      });
      return;
    }

    // Delete only if ownership and copy counts remain unchanged
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


