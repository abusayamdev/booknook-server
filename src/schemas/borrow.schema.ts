import { z } from "zod";

export const createBorrowSchema = z.object({
  bookId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid book ID."),

  returnDate: z
    .string()
    .datetime({ message: "Please provide a valid return date." })
    .refine(
      (value) => new Date(value).getTime() > Date.now(),
      "Return date must be in the future.",
    ),
});

export type CreateBorrowInput = z.infer<typeof createBorrowSchema>;
