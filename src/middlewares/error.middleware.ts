import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { CustomError } from "../types/custom-errors";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { HttpStatus } from "../utils/httpStatus.enum";

export const errorHandler = (
  err: Error | ZodError | PrismaClientKnownRequestError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Error Handler of Zod (validation)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof PrismaClientKnownRequestError) {
    logger.error("Prisma Client Known Request Error:", {
      code: err.code,
      message: err.message,
      meta: err.meta,
    });
    switch (err.code) {
      case "P2002":
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message: "Resource with this unique identifier already exists.",
          errorCode: "DUPLICATE_ENTRY",
          meta: err.meta,
        });
      case "P2025":
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: "Record not found.",
          errorCode: "RECORD_NOT_FOUND",
        });
      default:
        logger.error("Unhandled Prisma Client Known Request Error:", err);
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Database operation failed due to invalid data or request.",
          errorCode: "DATABASE_REQUEST_ERROR",
          prismaCode: err.code,
        });
    }
  }

  if (err instanceof PrismaClientValidationError) {
    logger.error("Prisma Client Validation Error:", err.message);
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid data provided for database operation.",
      errorCode: "PRISMA_VALIDATION_ERROR",
    });
  }

  // Error Handler for Custom Errors
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  // General Errors
  // Log for depuration
  logger.error(err);

  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
