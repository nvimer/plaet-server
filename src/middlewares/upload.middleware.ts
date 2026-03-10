import multer, { FileFilterCallback } from "multer";
import { storage } from "../services/storage.service";
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/custom-errors";
import { HttpStatus } from "../utils/httpStatus.enum";

// Configure Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    // Basic file type validation
    if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      return cb(
        new Error("Only image files (jpg, jpeg, png, webp) are allowed!"),
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware to handle single file upload.
 * Wraps multer's .single() to handle errors cleanly.
 * @param fieldName Name of the form field (e.g., 'image', 'photo')
 */
export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(
      req,
      res,
      (err: Error | string | null | undefined) => {
        if (!err) {
          return next();
        }
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          return next(
            new CustomError(
              `File upload error: ${err.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        }
        // An unknown error occurred when uploading.
        return next(
          new CustomError(
            typeof err === "string" ? err : err.message,
            HttpStatus.BAD_REQUEST,
          ),
        );
      },
    );
  };
};

/**
 * Middleware to handle multiple file uploads.
 * Wraps multer's .array()
 * @param fieldName Name of the form field (e.g., 'images')
 * @param maxCount Maximum number of files allowed
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(
      req,
      res,
      (err: Error | string | null | undefined) => {
        if (!err) {
          return next();
        }
        if (err instanceof multer.MulterError) {
          return next(
            new CustomError(
              `Files upload error: ${err.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        }
        return next(
          new CustomError(
            typeof err === "string" ? err : err.message,
            HttpStatus.BAD_REQUEST,
          ),
        );
      },
    );
  };
};
