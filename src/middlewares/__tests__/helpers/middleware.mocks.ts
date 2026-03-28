import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser, RoleWithPermissions } from "../../../types/express";
import { UserServiceInterface } from "../../../api/users/interfaces/user.service.interface";
import { createUserFixture } from "../../../api/users/__tests__/helpers/user.fixtures";
import { RoleName } from "@prisma/client";

/**
 * Creates a mock Express Request object for testing middlewares
 */
export function createMockRequest(
  overrides: Partial<Request> = {},
): Partial<Request> {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    user: undefined,
    originalUrl: "/test",
    method: "GET",
    ...overrides,
  };
}

/**
 * Creates a mock Express Response object for testing middlewares
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    get headersSent(): boolean {
      return false;
    },
  };
  return res;
}

/**
 * Creates a mock NextFunction for testing middlewares
 */
export function createMockNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

/**
 * Creates a mock AuthenticatedUser for testing
 */
export function createMockAuthenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  const user = createUserFixture();
  const role: RoleWithPermissions = {
    id: 1,
    restaurantId: user.restaurantId,
    name: RoleName.WAITER,
    description: "Waiter role",
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
    deletedAt: null,
    permissions: [],
  };

  return {
    id: user.id,
    email: user.email,
    restaurantId: user.restaurantId,
    roles: [
      {
        role,
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a mock Passport authenticate function
 *
 * Note: passport.authenticate returns a middleware function that needs to be called
 */
export function createMockPassportAuthenticate() {
  return jest.fn(
    (
      _strategy: string,
      _options: { session: boolean },
      callback: (
        err: Error | null,
        user: AuthenticatedUser | false,
        info?: { message?: string },
      ) => void,
    ) => {
      return (_req: Request, _res: Response, _next: NextFunction): void => {
        // Call the callback synchronously
        callback(null, false, { message: "Unauthorized" });
        // The middleware will call next() based on callback result
      };
    },
  );
}

/**
 * Pre-configured mock scenarios for middleware testing
 */
export const middlewareMockScenarios = {
  /**
   * Configures Passport mock for successful authentication
   */
  authenticatedUser: (
    mockAuthenticate: jest.Mock,
    user: AuthenticatedUser,
  ): void => {
    mockAuthenticate.mockImplementation(
      (
        _strategy: string,
        _options: { session: boolean },
        callback: (
          err: Error | null,
          user: AuthenticatedUser | false,
          info?: { message?: string },
        ) => void,
      ) => {
        return (_req: Request, _res: Response, _next: NextFunction): void => {
          // Call callback with user - authJwt will handle setting req.user and calling next
          callback(null, user);
        };
      },
    );
  },

  /**
   * Configures Passport mock for authentication failure
   */
  authenticationFailed: (
    mockAuthenticate: jest.Mock,
    message = "Unauthorized. Please login and retry",
  ): void => {
    mockAuthenticate.mockImplementation(
      (
        _strategy: string,
        _options: { session: boolean },
        callback: (
          err: Error | null,
          user: AuthenticatedUser | false,
          info?: { message?: string },
        ) => void,
      ) => {
        return (_req: Request, _res: Response, _next: NextFunction): void => {
          // Call callback with false user - authJwt will handle error
          callback(null, false, { message });
        };
      },
    );
  },

  /**
   * Configures Passport mock for authentication error
   */
  authenticationError: (mockAuthenticate: jest.Mock, error: Error): void => {
    mockAuthenticate.mockImplementation(
      (
        _strategy: string,
        _options: { session: boolean },
        callback: (
          err: Error | null,
          user: AuthenticatedUser | false,
          info?: { message?: string },
        ) => void,
      ) => {
        return (_req: Request, _res: Response, _next: NextFunction): void => {
          // Call callback with error - authJwt will pass it to next()
          callback(error, false);
        };
      },
    );
  },

  /**
   * Configures UserService mock for user with roles
   */
  userWithRoles: (
    mockUserService: jest.Mocked<UserServiceInterface>,
    user: AuthenticatedUser,
  ): void => {
    mockUserService.findUserWithRolesAndPermissions.mockResolvedValue(user);
  },

  /**
   * Configures UserService mock for user not found
   */
  userNotFound: (mockUserService: jest.Mocked<UserServiceInterface>): void => {
    const { CustomError } = require("../../../types/custom-errors");
    const { HttpStatus } = require("../../../utils/httpStatus.enum");
    mockUserService.findUserWithRolesAndPermissions.mockRejectedValue(
      new CustomError("User not found", HttpStatus.NOT_FOUND, "ID_NOT_FOUND"),
    );
  },
};
