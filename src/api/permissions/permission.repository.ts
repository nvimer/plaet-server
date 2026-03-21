import { Permission } from "@prisma/client";
import { PermissionRepositoryInterface } from "./interfaces/permission.repository.interface";
import {
  CreatePermissionInput,
  UpdatePermissionInput,
  PermissionSearchParams,
} from "./permission.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import prisma from "../../database/prisma";
import { createPaginatedResponse } from "../../utils/pagination.helper";

/**
 * Repository class for Permission database operations
 * Handles all direct database interactions for permissions
 */
class PermissionRepository implements PermissionRepositoryInterface {
  /**
   * Find all permissions with pagination
   * Returns only non-deleted permissions
   */
  async findAll(
    params: PaginationParams,
    includeSystem: boolean = true,
  ): Promise<PaginatedResponse<Permission>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted: false };
    if (!includeSystem) {
      where.isSystem = false;
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.permission.count({
        where,
      }),
    ]);

    return createPaginatedResponse(permissions, total, params);
  }

  /**
   * Find a permission by ID
   * Returns null if not found
   */
  async findById(id: number): Promise<Permission | null> {
    return prisma.permission.findUnique({
      where: { id },
    });
  }

  /**
   * Find a permission by name
   * Returns null if not found
   */
  async findByName(name: string): Promise<Permission | null> {
    return prisma.permission.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        deleted: false,
      },
    });
  }

  /**
   * Create a new permission
   */
  async create(data: CreatePermissionInput): Promise<Permission> {
    return prisma.permission.create({
      data,
    });
  }

  /**
   * Update an existing permission
   */
  async update(id: number, data: UpdatePermissionInput): Promise<Permission> {
    return prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a permission
   * Sets deleted flag to true instead of removing from database
   */
  async delete(id: number): Promise<Permission> {
    return prisma.permission.update({
      where: { id },
      data: { deleted: true },
    });
  }

  /**
   * Bulk delete multiple permissions
   * Returns the number of permissions that were deleted
   */
  async bulkDelete(ids: number[]): Promise<number> {
    const result = await prisma.permission.updateMany({
      where: {
        id: { in: ids },
        deleted: false,
      },
      data: { deleted: true },
    });

    return result.count;
  }

  /**
   * Search permissions with filtering and pagination
   * Supports name search and active status filtering
   */
  async search(
    params: PaginationParams & PermissionSearchParams,
    includeSystem: boolean = true,
  ): Promise<PaginatedResponse<Permission>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { deleted: false };

    if (!includeSystem) {
      where.isSystem = false;
    }

    // Add search filter if provided
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive" as const,
      };
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.permission.count({ where }),
    ]);

    return createPaginatedResponse(permissions, total, params);
  }
}

export default new PermissionRepository();
