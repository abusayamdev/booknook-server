import type { ErrorRequestHandler } from "express";

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  console.error("API Error:", error);

  // MongoDB duplicate key error
  if (error && error.code === 11000) {
    res.status(409).json({
      success: false,
      message: "This record already exists.",
    });
    return;
  }

  // Invalid JSON request body
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
    return;
  }

  const statusCode =
    typeof error?.status === "number" &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  const message =
    statusCode === 500
      ? "Internal server error."
      : error.message || "Something went wrong.";

  res.status(statusCode).json({
    success: false,
    message,
  });
};
