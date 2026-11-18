import { z } from "zod";

import { BOOK_CATEGORIES } from "../types/book.types.js";

export const createBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Book title must be at least 2 characters long.")
    .max(150, "Book title cannot exceed 150 characters."),

  author: z
    .string()
    .trim()
    .min(2, "Author name must be at least 2 characters long.")
    .max(100, "Author name cannot exceed 100 characters."),

  category: z.enum(BOOK_CATEGORIES),

  imageUrl: z.string().url("Please provide a valid book image URL."),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(3000, "Description cannot exceed 3000 characters."),

  totalCopies: z
    .number()
    .int("Total copies must be a whole number.")
    .min(1, "At least one copy is required.")
    .max(10000, "Total copies cannot exceed 10000."),
});

export const updateBookSchema = createBookSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required for an update.",
  );

export type CreateBookInput = z.infer<typeof createBookSchema>;

export type UpdateBookInput = z.infer<typeof updateBookSchema>;
