import { Request, Response, NextFunction } from "express";
import {
  authJwtStrategy as authJwt,
  authJwtOptionalStrategy as authJwtOptional,
  PassportAuthInfo,
} from "../../auth.middleware";
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockAuthenticatedUser,
  middlewareMockScenarios,
} from "../helpers/middleware.mocks";
import { CustomError } from "../../../types/custom-errors";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import passport from "passport";

// Mock passport
jest.mock("passport", () => ({
  authenticate: jest.fn(),
}));

describe("Auth Middleware - Unit Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockAuthenticate: jest.Mock;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockAuthenticate = passport.authenticate as jest.Mock;
    jest.clearAllMocks();
  });

  describe("authJwt - Successful authentication", () => {
    it("should call next() when authentication succeeds", async () => {
      // Arrange
      const user = createMockAuthenticatedUser();
      middlewareMockScenarios.authenticatedUser(mockAuthenticate, user);

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual(user);
    });

    it("should add user to req.user when authentication succeeds", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        id: "test-user-id",
        email: "test@example.com",
      });
      middlewareMockScenarios.authenticatedUser(mockAuthenticate, user);

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockRequest.user).toEqual(user);
      expect(mockRequest.user?.id).toBe("test-user-id");
      expect(mockRequest.user?.email).toBe("test@example.com");
    });
  });

  describe("authJwt - Authentication failure", () => {
    it("should call next() with CustomError when user is not authenticated", async () => {
      // Arrange
      middlewareMockScenarios.authenticationFailed(mockAuthenticate);

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as unknown;
      expect(error).toBeInstanceOf(CustomError);
      if (error instanceof CustomError) {
        expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(error.errorCode).toBe("UNAUTHORIZED_ACCESS");
      }
    });

    it("should use info message when authentication fails with custom message", async () => {
      // Arrange
      const customMessage = "Token expired";
      middlewareMockScenarios.authenticationFailed(
        mockAuthenticate,
        customMessage,
      );

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as unknown;
      expect(error).toBeInstanceOf(CustomError);
      if (error instanceof CustomError) {
        expect(error.message).toBe(customMessage);
      }
    });

    it("should use default message when info message is not provided", async () => {
      // Arrange
      mockAuthenticate.mockImplementation(
        (
          _strategy: string,
          _options: { session: boolean },
          callback: (
            err: Error | null,
            user: unknown,
            info?: PassportAuthInfo,
          ) => void,
        ) => {
          return (_req: Request, _res: Response, _next: NextFunction): void => {
            callback(null, false);
          };
        },
      );

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as unknown;
      expect(error).toBeInstanceOf(CustomError);
      if (error instanceof CustomError) {
        expect(error.message).toBe("Unauthorized. Please login and retry");
      }
    });
  });

  describe("authJwt - Authentication error", () => {
    it("should call next() with error when passport returns an error", async () => {
      // Arrange
      const passportError = new Error("Passport authentication error");
      middlewareMockScenarios.authenticationError(
        mockAuthenticate,
        passportError,
      );

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(passportError);
    });
  });

  describe("authJwt - Passport configuration", () => {
    it("should call passport.authenticate with 'jwt' strategy", () => {
      // Arrange
      middlewareMockScenarios.authenticationFailed(mockAuthenticate);

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthenticate).toHaveBeenCalledWith(
        "jwt",
        { session: false },
        expect.any(Function),
      );
    });

    it("should configure passport with session: false", () => {
      // Arrange
      middlewareMockScenarios.authenticationFailed(mockAuthenticate);

      // Act
      authJwt(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthenticate).toHaveBeenCalledWith(
        "jwt",
        { session: false },
        expect.any(Function),
      );
    });
  });
});
