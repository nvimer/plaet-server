import { MenuCategory } from "@prisma/client";
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CategorySearchParams,
} from "./category.validator";
import { CategoryRepositoryInterface } from "./interfaces/category.repository.interface";
import prisma from "../../../database/prisma";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../../utils/pagination.helper";

/**
 * Repository class responsible for data access operations related to menu categories.
 * This is the lowest layer in the architecture that directly interacts with the database
 * through Prisma ORM. It handles all CRUD operations for the MenuCategory entity.
 */
class CategoryRepository implements CategoryRepositoryInterface {
  /**
   * Retrieves a paginated list of all non-deleted menu categories from the database.
   * This method implements efficient pagination by calculating skip/take values
   * and fetching both the data and total count in parallel.
   *
   * Ordering:
   * - Primary sort: order field (ascending) - for manual display ordering
   * - Secondary sort: name field (ascending) - for categories with same order
   */
  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<MenuCategory>> {
    const { page, limit } = params;

    const skip = (page - 1) * limit;

    const [menuCategories, total] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { deleted: false }, // Only include non-deleted categories
        orderBy: [{ order: "asc" }, { name: "asc" }], // Primary sort by order, secondary by name
        skip, // Skip records for pagination
        take: limit, // Limit number of records returned
      }),
      prisma.menuCategory.count({
        where: { deleted: false },
      }),
    ]);

    return createPaginatedResponse(menuCategories, total, params);
  }

  /**
   * Retrieves a specific menu category by its unique identifier.
   * This method uses Prisma's findUnique for optimal performance on primary key lookups.
   */
  async findById(id: number): Promise<MenuCategory | null> {
    return await prisma.menuCategory.findUnique({ where: { id } });
  }

  /**
   * Retrieves a menu category by its name.
   * This method is used for duplicate name checking during creation and updates.
   */
  async findByName(name: string): Promise<MenuCategory | null> {
    return await prisma.menuCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive", // Case-insensitive search
        },
        deleted: false, // Only search non-deleted categories
      },
    });
  }

  /**
   * Creates a new menu category in the database.
   * This method accepts validated input data and creates a new record.
   */
  async create(data: CreateMenuCategoryInput): Promise<MenuCategory> {
    return await prisma.menuCategory.create({ data });
  }

  /**
   * Updates an existing menu category in the database.
   * This method updates only the fields provided in the data parameter.
   */
  async update(
    id: number,
    data: UpdateMenuCategoryInput,
  ): Promise<MenuCategory> {
    // Update category record using Prisma's update method
    return await prisma.menuCategory.update({ where: { id }, data });
  }

  /**
   * Soft deletes a menu category by setting the deleted flag to true.
   * This method implements soft delete to preserve data integrity and allow recovery.
   */
  async delete(id: number): Promise<MenuCategory> {
    return await prisma.menuCategory.update({
      where: { id },
      data: {
        deleted: true,
      },
    });
  }

  /**
   * Soft deletes multiple menu categories by their IDs.
   * This method implements bulk soft delete for efficient batch operations.
   */
  async bulkDelete(ids: number[]): Promise<number> {
    const result = await prisma.menuCategory.updateMany({
      where: {
        id: { in: ids },
        deleted: false, // Only delete non-deleted categories
      },
      data: {
        deleted: true,
      },
    });

    return result.count;
  }

  /**
   * Searches for menu categories with optional filtering and pagination.
   * This method provides flexible search capabilities for finding categories.
   */
  async search(
    params: PaginationParams & CategorySearchParams,
  ): Promise<PaginatedResponse<MenuCategory>> {
    const { page, limit, search, active } = params;
    const skip = (page - 1) * limit;

    const whereConditions: Record<string, unknown> = {
      deleted: false, // Always exclude deleted categories
    };

    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive", // Case-insensitive search
      };
    }

    if (active !== undefined) {
      whereConditions.active = active;
    }

    const [menuCategories, total] = await Promise.all([
      prisma.menuCategory.findMany({
        where: whereConditions,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.menuCategory.count({
        where: whereConditions,
      }),
    ]);

    return createPaginatedResponse(menuCategories, total, { page, limit });
  }
}

export default new CategoryRepository();
