import type { Document, ObjectId } from "mongodb";

export const BOOK_CATEGORIES = [
  "Fiction",
  "Science",
  "History",
  "Kids",
  "Others",
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export interface BookOwner {
  name: string;
  email: string;
}

export interface BookDocument extends Document {
  _id?: ObjectId;
  title: string;
  author: string;
  category: BookCategory;
  imageUrl: string;
  description: string;
  addedBy: BookOwner;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}
