import { MongoClient, type Db } from "mongodb";

import type { BookDocument } from "../types/book.types.js";
import type { BorrowDocument } from "../types/borrow.types.js";

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.DB_NAME;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from environment variables.");
  }

  if (!databaseName) {
    throw new Error("DB_NAME is missing from environment variables.");
  }

  try {
    client = new MongoClient(uri);

    await client.connect();

    database = client.db(databaseName);

    // Verify database connection
    await database.command({ ping: 1 });

    // Prevent duplicate active borrowing by the same user
    await database
      .collection("borrows")
      .createIndex({ bookId: 1, userEmail: 1 }, { unique: true });

    console.log(`MongoDB connected successfully: ${databaseName}`);

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error);

    if (client) {
      await client.close().catch(() => undefined);
      client = null;
    }

    database = null;

    throw error;
  }
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error("Database is not connected. Call connectDatabase() first.");
  }

  return database;
}

export function getBooksCollection() {
  return getDatabase().collection<BookDocument>("books");
}

export function getBorrowsCollection() {
  return getDatabase().collection<BorrowDocument>("borrows");
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error(
      "MongoDB client is not connected. Call connectDatabase() first.",
    );
  }

  return client;  
}


/// Database connection management for serverless environments (like Vercel)