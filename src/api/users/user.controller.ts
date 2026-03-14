import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import userService from "./user.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { UpdateUserInput, UserSearchParams } from "./user.validator";
import { RegisterInput } from "../auth/auth.validator";
import { AuthenticatedUser } from "../../types/express";
import { logger } from "../../config/logger";
import {
  PaginationParams,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../../interfaces/pagination.interfaces";

class UserController {
  /**
   * GET /users
   *
   * Retrieves a paginated list of all users in the system.
   *
   * @param req - Express request object containing pagination query parameters
   * @param res - Express response object
   *
   * Query Parameters:
   * - page: Page number for pagination (defaults to 1)
   * - limit: Number of items per page (defaults to 10)
   *
   * Response:
   * - 200: Success with paginated users data
   * - 400: Invalid pagination parameters
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const user = req.user as AuthenticatedUser;

    const params: PaginationParams = { page, limit };

    const users = await userService.findAll(
      params,
      user?.restaurantId || undefined,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Users fetched successfully",
      data: users.data,
      meta: users.meta,
    });
  });

  /**
   * GET /users/search
   *
   * Searches users with filtering and pagination capabilities.
   * This endpoint allows searching by firstName, lastName, or email
   * for efficient user management.
   *
   * @param req - Express request object with query parameters
   * @param res - Express response object
   *
   * Query Parameters:
   * - page: Page number (optional, default: 1)
   * - limit: Records per page (optional, default: 10)
   * - search: Search term for firstName, lastName, or email (optional)
   *
   * Response:
   * - 200: Filtered users retrieved successfully
   * - 400: Invalid search parameters
   * - 500: Server error during search
   */
  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const search = req.query.search as string;
    const user = req.user as AuthenticatedUser;

    // Create combined parameters object
    const params: PaginationParams & UserSearchParams = {
      page,
      limit,
      search,
    };

    const users = await userService.searchUsers(
      params,
      user?.restaurantId || undefined,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Users search completed successfully",
      data: users.data,
      meta: users.meta,
    });
  });

  /**
   * GET /users/:id
   *
   * Retrieves a specific user by their unique identifier.
   *
   * @param req - Express request object containing user ID in params
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: User ID (UUID string)
   *
   * Response:
   * - 200: User found and returned
   * - 400: Invalid ID format
   * - 404: User not found
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    const user = await userService.findById(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  });

  /**
   * GET /users/email/:email
   *
   * Retrieves a user by their email address.
   * This endpoint is useful for user lookup during authentication
   * or when email is the primary identifier.
   *
   * @param req - Express request object containing email in params
   * @param res - Express response object
   *
   * URL Parameters:
   * - email: User's email address
   *
   * Response:
   * - 200: User found and returned
   * - 404: User not found
   */
  getUserByEmail = asyncHandler(async (req: Request, res: Response) => {
    const email = req.params.email;

    const user = await userService.findByEmail(email);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  });

  /**
   * POST /users/register
   *
   * Registers a new user in the system.
   * This endpoint handles user registration with role assignment
   * and password hashing for security.
   *
   * @param req - Express request object containing user registration data
   * @param res - Express response object
   *
   * Request Body:
   * - firstName: User's last name (required)
   * - lastName: User's last name (required)
   * - email: User's email address (required, must be unique)
   * - password: User's password (required, will be hashed)
   * - phone: User's phone number (optional)
   * - roleIds: Array of role IDs to assign (optional)
   *
   * Response:
   * - 201: User registered successfully
   * - 400: Invalid request data
   * - 409: Email already exists
   *
   * The response excludes the password for security reasons.
   */
  registerUser = asyncHandler(async (req: Request, res: Response) => {
    const data: RegisterInput = req.body;
    const user = req.user as AuthenticatedUser;
    const restaurantId = user?.restaurantId;

    logger.info(`[USER] Creating user with restaurantId: ${restaurantId}, user: ${user?.id}`);

    const newUser = await userService.register(data, restaurantId || undefined);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "User registered successfully",
      data: newUser,
    });
  });

  /**
   * PATCH /users/:id
   *
   * Updates an existing user's information.
   * This endpoint supports partial updates, allowing clients
   * to update only specific fields without affecting others.
   *
   * @param req - Express request object containing user ID and update data
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: User ID (UUID string)
   *
   * Request Body (all fields optional):
   * - firstName: User's first name
   * - lastName: User's last name
   * - email: User's email address (must be unique if changed)
   * - phone: User's phone number
   *
   * Response:
   * - 202: User updated successfully
   * - 400: Invalid request data
   * - 404: User not found
   * - 409: Email already exists (if email is being changed)
   *
   * Only the fields provided in the request body will be updated.
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const data: UpdateUserInput = req.body;

    const user = await userService.updateUser(id, data);
    res.status(HttpStatus.ACCEPTED).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  });

  /**
   * GET /users/:id/roles-permissions
   *
   * Retrieves a user with their complete role and permission information.
   * This endpoint is essential for authentication and authorization systems
   * as it provides the complete access control context for a user.
   *
   * @param req - Express request object containing user ID
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: User ID (UUID string)
   *
   * Response:
   * - 200: User with roles and permissions found
   * - 400: Invalid ID format
   * - 404: User not found
   *
   * Response includes:
   * - User basic information
   * - All assigned roles
   * - All permissions from assigned roles
   *
   */
  getUserWithRolesAndPermissions = asyncHandler(
    async (req: Request, res: Response) => {
      const id = req.params.id;

      const user = await userService.findUserWithRolesAndPermissions(id);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "User with roles and permissions fetched successfully",
        data: user,
      });
    },
  );
}

export default new UserController();
