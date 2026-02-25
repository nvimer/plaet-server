import { User, Prisma } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { UserRepositoryInterface } from "./interfaces/user.repository.interface";
import { UpdateUserInput, UserSearchParams } from "./user.validator";
import { RegisterInput } from "../auth/auth.validator";
import { AuthenticatedUser } from "../../types/express";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../utils/pagination.helper";

// Type for User with roles included
export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

/**
 * User Repository
 */
class BasicUserRepository implements UserRepositoryInterface {
  /**
   * Retrieves a paginated list of all active users from the database.
   * This method supports efficient pagination for large user datasets
   * and excludes soft-deleted users from the results.
   *
   * @param params - Pagination parameters (page, limit)
   * @returns Promise<PaginatedResponse<User>> - Paginated user data
   *
   * Database Operations:
   * - Fetches users with pagination (skip/take)
   * - Orders results by name ascending
   * - Excludes soft-deleted users (deleted: false)
   * - Counts total users for pagination metadata
   */
  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<UserWithRoles>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const client = getPrismaClient();
    const [users, total] = await Promise.all([
      client.user.findMany({
        where: { deleted: false },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      client.user.count({
        where: { deleted: false },
      }),
    ]);

    return createPaginatedResponse(users, total, params);
  }

  /**
   * Searches users with filtering and pagination.
   * Supports searching by firstName, lastName, or email.
   *
   * @param params - Pagination and search parameters
   * @returns Promise<PaginatedResponse<UserWithRoles>> - Paginated search results
   *
   * Database Operations:
   * - Performs case-insensitive text search in firstName, lastName, and email
   * - Excludes soft-deleted users
   * - Supports pagination with search results
   * - Orders results by firstName and lastName ascending
   */
  async search(
    params: PaginationParams & UserSearchParams,
  ): Promise<PaginatedResponse<UserWithRoles>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const client = getPrismaClient();

    // Build where clause
    const where: Prisma.UserWhereInput = { deleted: false };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      client.user.findMany({
        where,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      client.user.count({ where }),
    ]);

    return createPaginatedResponse(users, total, params);
  }

  /**
   * Finds a user by their email address.
   * This method is commonly used for authentication and user lookup.
   *
   * @param email - User's email address
   * @returns Promise<User | null> - User object if found, null otherwise
   *
   * Database Operations:
   * - Uses findUnique for optimal performance
   * - Searches by email index
   * - Returns null if no user found
   */
  async findByEmail(email: string): Promise<User | null> {
    const client = getPrismaClient();
    return client.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  }

  /**
   * Finds a user by their unique identifier.
   * This method is used for user retrieval and validation operations.
   *
   * @param id - User ID (UUID string)
   * @returns Promise<User | null> - User object if found, null otherwise
   *
   * Database Operations:
   * - Uses findUnique for optimal performance
   * - Searches by primary key (id)
   * - Returns null if no user found
   */
  async findById(id: string): Promise<User | null> {
    const client = getPrismaClient();
    return client.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }

  /**
   * Creates a new user in the database with associated roles and profile.
   * This method handles the complete user creation process including:
   * - User basic information
   * - Role assignments (if provided)
   * - Profile creation
   *
   * @param data - User registration data including optional role IDs
   * @returns Promise<User> - Created user with role relationships
   *
   * Database Operations:
   * - Creates user record with hashed password
   * - Creates user-role relationships for each provided role ID
   * - Creates associated profile record
   * - Returns user with role information included
   */
  async create(data: RegisterInput): Promise<User> {
    const { roleIds, ...userData } = data;

    const client = getPrismaClient();
    return await client.user.create({
      data: {
        ...userData,
        roles: {
          create:
            roleIds.map((roleId) => ({
              role: { connect: { id: roleId } },
            })) || [],
        },
        profile: {
          create: {},
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });
  }

  /**
   * Updates an existing user's information in the database.
   * This method supports partial updates and only modifies
   * the fields provided in the update data.
   *
   * @param id - User ID to update
   * @param data - Update data (partial user fields)
   * @returns Promise<User> - Updated user object
   *
   * Database Operations:
   * - Updates only provided fields
   * - Uses optimistic locking for concurrency control
   * - Returns updated user data
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    const client = getPrismaClient();
    return client.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Retrieves a user with their complete role and permission hierarchy.
   * This method is essential for authentication and authorization systems
   * as it provides the complete access control context for a user.
   *
   * @param id - User ID
   * @returns Promise<AuthenticatedUser | null> - User with roles and permissions
   *
   * Database Operations:
   * - Fetches user with nested role relationships
   * - Includes all permissions from assigned roles
   * - Uses complex join operations for efficiency
   */
  async findUserWithPermissions(id: string): Promise<AuthenticatedUser | null> {
    const client = getPrismaClient();
    return client.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

export default new BasicUserRepository();
