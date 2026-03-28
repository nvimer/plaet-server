import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../error.middleware";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { CustomError } from "../../../types/custom-errors";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import {
  createMockRequest,
  createMockResponse,
} from "../helpers/middleware.mocks";
import { logger } from "../../../config/logger";

// Mock logger
jest.mock("../../../config/logger", () => ({
  logger: {
    error: jest.fn(),
    http: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Error Middleware - Unit Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockNext: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  describe("errorHandler - ZodError", () => {
    it("should return 400 with validation errors when ZodError is thrown", () => {
      // Arrange
      const zodError = new ZodError([
        {
          code: "too_small",
          minimum: 3,
          type: "string",
          inclusive: true,
          exact: false,
          message: "String must contain at least 3 character(s)",
          path: ["body", "name"],
        },
        {
          code: "invalid_type",
          expected: "number",
          received: "string",
          message: "Expected number, received string",
          path: ["body", "age"],
        },
      ]);

      // Act
      errorHandler(
        zodError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation error",
        errors: [
          {
            path: "body.name",
            message: "String must contain at least 3 character(s)",
          },
          {
            path: "body.age",
            message: "Expected number, received string",
          },
        ],
      });
    });

    it("should handle empty ZodError errors array", () => {
      // Arrange
      const zodError = new ZodError([]);

      // Act
      errorHandler(
        zodError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation error",
        errors: [],
      });
    });
  });

  describe("errorHandler - PrismaClientKnownRequestError", () => {
    it("should return 409 when error code is P2002 (duplicate entry)", () => {
      // Arrange
      // Create a mock Prisma error that passes instanceof check
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
          meta: {
            target: ["email"],
          },
        },
      );

      // Act
      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Resource with this unique identifier already exists.",
        errorCode: "DUPLICATE_ENTRY",
        meta: prismaError.meta,
      });
    });

    it("should return 404 when error code is P2025 (record not found)", () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Record to delete does not exist",
        {
          code: "P2025",
          clientVersion: "5.0.0",
        },
      );

      // Act
      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Record not found.",
        errorCode: "RECORD_NOT_FOUND",
      });
    });

    it("should return 400 for other PrismaClientKnownRequestError codes", () => {
      // Arrange
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "5.0.0",
        },
      );

      // Act
      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Database operation failed due to invalid data or request.",
        errorCode: "DATABASE_REQUEST_ERROR",
        prismaCode: "P2003",
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Unhandled Prisma Client Known Request Error:",
        prismaError,
      );
    });
  });

  describe("errorHandler - PrismaClientValidationError", () => {
    it("should return 400 when PrismaClientValidationError is thrown", () => {
      // Arrange
      const prismaValidationError = new Prisma.PrismaClientValidationError(
        "Invalid data provided",
        {
          clientVersion: "5.0.0",
        },
      );

      // Act
      errorHandler(
        prismaValidationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid data provided for database operation.",
        errorCode: "PRISMA_VALIDATION_ERROR",
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Prisma Client Validation Error:",
        "Invalid data provided",
      );
    });
  });

  describe("errorHandler - CustomError", () => {
    it("should return correct status code and error code from CustomError", () => {
      // Arrange
      const customError = new CustomError(
        "Resource not found",
        HttpStatus.NOT_FOUND,
        "RESOURCE_NOT_FOUND",
      );

      // Act
      errorHandler(
        customError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Resource not found",
        errorCode: "RESOURCE_NOT_FOUND",
      });
    });

    it("should handle CustomError without errorCode", () => {
      // Arrange
      const customError = new CustomError(
        "Unauthorized access",
        HttpStatus.UNAUTHORIZED,
      );

      // Act
      errorHandler(
        customError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
        errorCode: undefined,
      });
    });
  });

  describe("errorHandler - Generic errors", () => {
    it("should return 500 for generic errors in development environment", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      const genericError = new Error("Something went wrong");

      // Act
      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong!",
        error: "Something went wrong",
      });
      expect(logger.error).toHaveBeenCalledWith(genericError);
    });

    it("should not expose error message in production environment", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      const genericError = new Error("Internal server error");

      // Act
      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong!",
        error: undefined,
      });
      expect(logger.error).toHaveBeenCalledWith(genericError);
    });

    it("should log generic errors", () => {
      // Arrange
      const genericError = new Error("Database connection failed");

      // Act
      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(logger.error).toHaveBeenCalledWith(genericError);
    });
  });

  describe("errorHandler - Error priority", () => {
    it("should handle ZodError before CustomError when error is both", () => {
      // Arrange
      // ZodError is checked first, so it should be handled as ZodError
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          message: "Expected string",
          path: ["body", "name"],
        },
      ]);

      // Act
      errorHandler(
        zodError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation error",
        }),
      );
    });
  });
});
