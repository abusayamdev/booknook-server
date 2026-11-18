import type { Document, ObjectId } from "mongodb";

export interface BorrowDocument extends Document {
  _id?: ObjectId;

  bookId: ObjectId;
  bookTitle: string;
  bookImage: string;

  userName: string;
  userEmail: string;

  borrowDate: Date;
  returnDate: Date;
}
