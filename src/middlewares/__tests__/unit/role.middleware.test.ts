import { Request, Response, NextFunction } from "express";
import { roleMiddleware } from "../../role.middleware";
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockAuthenticatedUser,
} from "../helpers/middleware.mocks";
import { RoleName } from "@prisma/client";
import { AuthenticatedUser } from "../../../types/express";
import userService from "../../../api/users/user.service";

// Mock userService
jest.mock("../../../api/users/user.service", () => {
  return {
    __esModule: true,
    default: {
      findUserWithRolesAndPermissions: jest.fn(),
    },
  };
});

describe("Role Middleware - Unit Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe("roleMiddleware - Successful authorization", () => {
    it("should call next() when user has allowed role", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        roles: [
          {
            role: {
              id: 1,
              name: RoleName.WAITER,
              description: "Waiter role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
        ],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(userService.findUserWithRolesAndPermissions).toHaveBeenCalledWith(
        user.id,
      );
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow access when user has one of multiple allowed roles", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        roles: [
          {
            role: {
              id: 1,
              name: RoleName.ADMIN,
              description: "Admin role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
        ],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.WAITER, RoleName.ADMIN]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow access when user has multiple roles and one matches", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        roles: [
          {
            role: {
              id: 1,
              name: RoleName.WAITER,
              description: "Waiter role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
          {
            role: {
              id: 2,
              name: RoleName.CASHIER,
              description: "Cashier role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
        ],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("roleMiddleware - Authorization failure", () => {
    it("should return 401 when req.user is not present", async () => {
      // Arrange
      mockRequest.user = undefined;
      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Unauthorized",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when req.user.id is not present", async () => {
      // Arrange
      mockRequest.user = {
        id: "",
        email: "test@example.com",
        roles: [],
      } as AuthenticatedUser;

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Unauthorized",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user does not have allowed role", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        roles: [
          {
            role: {
              id: 1,
              name: RoleName.WAITER,
              description: "Waiter role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
        ],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.ADMIN]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Forbidden",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user has no roles", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        roles: [],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Forbidden",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("roleMiddleware - Error handling", () => {
    it("should call next() with error when userService throws error", async () => {
      // Arrange
      const user = createMockAuthenticatedUser();
      const serviceError = new Error("Service error");

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockRejectedValue(serviceError);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });

    it("should handle CustomError from userService correctly", async () => {
      // Arrange
      const user = createMockAuthenticatedUser();
      const { CustomError } = require("../../../types/custom-errors");
      const { HttpStatus } = require("../../../utils/httpStatus.enum");
      const customError = new CustomError(
        "User not found",
        HttpStatus.NOT_FOUND,
        "ID_NOT_FOUND",
      );

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockRejectedValue(customError);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(customError);
    });
  });

  describe("roleMiddleware - UserService integration", () => {
    it("should call findUserWithRolesAndPermissions with correct user ID", async () => {
      // Arrange
      const user = createMockAuthenticatedUser({
        id: "test-user-id-123",
        roles: [
          {
            role: {
              id: 1,
              name: RoleName.WAITER,
              description: "Waiter role",
              createdAt: new Date(),
              updatedAt: new Date(),
              deleted: false,
              deletedAt: null,
              permissions: [],
            },
          },
        ],
      });

      mockRequest.user = user;
      (
        userService.findUserWithRolesAndPermissions as jest.Mock
      ).mockResolvedValue(user);

      const middleware = roleMiddleware([RoleName.WAITER]);

      // Act
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Assert
      expect(userService.findUserWithRolesAndPermissions).toHaveBeenCalledWith(
        "test-user-id-123",
      );
      expect(userService.findUserWithRolesAndPermissions).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
