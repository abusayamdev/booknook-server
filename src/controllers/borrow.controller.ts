import type { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";

import {
  getBooksCollection,
  getBorrowsCollection,
  getMongoClient,
} from "../config/database.js";

import { createBorrowSchema } from "../schemas/borrow.schema.js";

export async function createBorrow(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = createBorrowSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Borrow validation failed.",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "You must be logged in to borrow a book.",
    });
    return;
  }

  const { bookId: bookIdString, returnDate } = validation.data;
  const bookId = new ObjectId(bookIdString);

  const client = getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const booksCollection = getBooksCollection();
      const borrowsCollection = getBorrowsCollection();

      // Check whether the book exists
      const book = await booksCollection.findOne({ _id: bookId }, { session });

      if (!book) {
        return {
          success: false as const,
          status: 404,
          message: "Book not found.",
        };
      }

      // Prevent duplicate active borrowing
      const existingBorrow = await borrowsCollection.findOne(
        {
          bookId,
          userEmail: req.user!.email,
        },
        { session },
      );

      if (existingBorrow) {
        return {
          success: false as const,
          status: 409,
          message: "You have already borrowed this book.",
        };
      }

      // Atomically decrement available copies
      const updateResult = await booksCollection.updateOne(
        {
          _id: bookId,
          availableCopies: { $gt: 0 },
        },
        {
          $inc: { availableCopies: -1 },
          $set: { updatedAt: new Date() },
        },
        { session },
      );

      if (updateResult.modifiedCount !== 1) {
        return {
          success: false as const,
          status: 409,
          message: "This book is currently unavailable.",
        };
      }

      const borrow = {
        bookId,
        bookTitle: book.title,
        bookImage: book.imageUrl,
        userName: req.user!.name,
        userEmail: req.user!.email,
        borrowDate: new Date(),
        returnDate: new Date(returnDate),
      };

      const insertResult = await borrowsCollection.insertOne(borrow, {
        session,
      });

      return {
        success: true as const,
        data: {
          _id: insertResult.insertedId,
          ...borrow,
        },
      };
    });

    if (!result) {
      throw new Error("Borrow transaction returned no result.");
    }

    if (!result.success) {
      res.status(result.status).json({
        success: false,
        message: result.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully.",
      data: result.data,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
}



export async function getMyBorrows(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to view your borrows.",
      });
      return;
    }

    const borrowsCollection = getBorrowsCollection();

    const borrows = await borrowsCollection
      .find({
        userEmail: req.user.email,
      })
      .sort({ borrowDate: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Borrow history retrieved successfully.",
      total: borrows.length,
      data: borrows,
    });
  } catch (error) {
    next(error);
  }
}



export async function returnBook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;

  // Validate Borrow ID
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid borrow ID.",
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "You must be logged in to return a book.",
    });
    return;
  }

  const borrowId = new ObjectId(id);
  const client = getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const borrowsCollection = getBorrowsCollection();
      const booksCollection = getBooksCollection();

      // Find the borrow record owned by the logged-in user
      const borrow = await borrowsCollection.findOne(
        {
          _id: borrowId,
          userEmail: req.user!.email,
        },
        { session },
      );

      if (!borrow) {
        return {
          success: false as const,
          status: 404,
          message: "Borrow record not found.",
        };
      }

      // Increase available copies without exceeding total copies
      const bookUpdate = await booksCollection.updateOne(
        {
          _id: borrow.bookId,
          $expr: {
            $lt: ["$availableCopies", "$totalCopies"],
          },
        },
        {
          $inc: { availableCopies: 1 },
          $set: { updatedAt: new Date() },
        },
        { session },
      );

      if (bookUpdate.modifiedCount !== 1) {
        throw new Error(
          "Book copy count could not be updated. Return transaction cancelled.",
        );
      }

      // Delete the borrow record
      const deleteResult = await borrowsCollection.deleteOne(
        {
          _id: borrowId,
          userEmail: req.user!.email,
        },
        { session },
      );

      if (deleteResult.deletedCount !== 1) {
        throw new Error(
          "Borrow record could not be deleted. Return transaction cancelled.",
        );
      }

      return {
        success: true as const,
        data: {
          borrowId: borrowId.toString(),
          bookTitle: borrow.bookTitle,
          bookId: borrow.bookId.toString(),
        },
      };
    });

    if (!result) {
      throw new Error("Return transaction returned no result.");
    }

    if (!result.success) {
      res.status(result.status).json({
        success: false,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Book returned successfully.",
      data: result.data,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
}

