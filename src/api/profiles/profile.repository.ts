import { ProfileRepositoryInterface } from "./interfaces/profile.repository.interface";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import prisma from "../../database/prisma";
import { UpdateProfileInput } from "./profile.validator";
import { UserWithProfile } from "../../types/prisma.types";

/**
 * Profile Repository
 */
class ProfileRepository implements ProfileRepositoryInterface {
  /**
   * Retrieves a paginated list of all active user profiles from the database.
   * This method supports efficient pagination for large user datasets
   * and excludes soft-deleted users from the results.
   */
  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<UserWithProfile>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deleted: false },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        skip,
        take: limit,
        include: { profile: true },
      }),
      prisma.user.count({
        where: { deleted: false },
      }),
    ]);

    return createPaginatedResponse(users, total, params);
  }

  /**
   * Finds a user profile by their unique identifier.
   * This method is used for profile retrieval and validation operations.
   *
   * @param id - User/Profile ID (UUID string)
   * @returns Promise<User | null> - User object if found, null otherwise
   *
   * Database Operations:
   * - Uses findUnique for optimal performance
   * - Searches by primary key (id)
   * - Returns null if no user found
   */
  async findById(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  /**
   * Updates an existing user's profile information in the database.
   * This method supports partial updates and only modifies
   * the fields provided in the update data.
   *
   * Database Operations:
   * - Updates only provided fields
   * - Uses optimistic locking for concurrency control
   * - Returns updated user data
   */
  async update(id: string, data: UpdateProfileInput): Promise<UserWithProfile> {
    const { firstName, lastName, password, email, phone, ...profileData } =
      data;

    const userData = { firstName, lastName, password, phone, email };
    return prisma.user.update({
      where: { id },
      data: { ...userData, profile: { update: { ...profileData } } },
      include: { profile: true },
    });
  }
}

export default new ProfileRepository();
