import { Role } from "@prisma/client";
import prisma from "../../database/prisma";
import { RoleRepositoryInterface } from "./interfaces/role.repository.interface";
import { CreateRoleInput, UpdateRoleInput } from "./role.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import { PrismaTransaction } from "../../types/prisma-transaction.types";

/**
 * Role Repository
 */
class RoleRepository implements RoleRepositoryInterface {
  /**
   * Retrieves a paginated list of all active roles from the database.
   * This method supports efficient pagination for large role datasets
   * and excludes soft-deleted roles from the results.
   */
  async findAll(
    params: PaginationParams,
    restaurantId?: string,
    includeSystem: boolean = false,
  ): Promise<PaginatedResponse<Role>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted: false };
    
    if (restaurantId && !includeSystem) {
      where.restaurantId = restaurantId;
    } else if (restaurantId && includeSystem) {
      where.OR = [
        { restaurantId },
        { restaurantId: null }
      ];
    } else if (!restaurantId && !includeSystem) {
      where.restaurantId = null;
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true }
          }
        },
        skip,
        take: limit,
      }),
      prisma.role.count({
        where,
      }),
    ]);

    return createPaginatedResponse(roles, total, params);
  }

  /**
   * Searches and filters roles based on various criteria.
   * This method provides advanced filtering capabilities for
   * role management and administrative interfaces.
   *
   * Database Operations:
   * - Performs case-insensitive text search in role names
   * - Filters by active status if provided
   * - Excludes soft-deleted roles
   * - Supports pagination with search results
   */
  async searchRoles(
    params: PaginationParams,
    search: string,
    active?: boolean,
    restaurantId?: string,
    includeSystem: boolean = false,
  ): Promise<PaginatedResponse<Role>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      deleted: false,
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    };

    if (restaurantId && !includeSystem) {
      whereClause.restaurantId = restaurantId;
    } else if (restaurantId && includeSystem) {
      whereClause.OR = [
        { restaurantId },
        { restaurantId: null }
      ];
    } else if (!restaurantId && !includeSystem) {
      whereClause.restaurantId = null;
    }

    if (active !== undefined) {
      whereClause.active = active;
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { users: true }
          }
        },
        skip,
        take: limit,
      }),
      prisma.role.count({
        where: whereClause,
      }),
    ]);

    return createPaginatedResponse(roles, total, params);
  }

  /**
   * Finds a role by their unique identifier.
   * This method is used for role retrieval and validation operations.
   *
   * Database Operations:
   * - Uses findUnique for optimal performance
   * - Searches by primary key (id)
   * - Returns null if no role found
   */
  async findById(id: number): Promise<Role | null> {
    return prisma.role.findUnique({
      where: { id },
    });
  }

  /**
   * Creates a new role in the database with associated permissions.
   * This method handles the complete role creation process including:
   * - Role basic information
   * - Permission assignments (if provided)
   *
   * Database Operations:
   * - Creates role record with basic information
   * - Creates role-permission relationships for each provided permission ID
   * - Returns role with permission information included
   */
  async createRole(data: CreateRoleInput): Promise<Role> {
    const { permissionIds, ...roleData } = data;

    return await prisma.role.create({
      data: {
        ...roleData,
        permissions: {
          create:
            permissionIds?.map((permissionId) => ({
              permission: { connect: { id: permissionId } },
            })) || [],
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * Updates an existing role's information in the database.
   * This method supports partial updates and can handle permission
   * reassignment when permission IDs are provided.
   *
   * All operations are performed in a single transaction to ensure
   * atomicity and data consistency.
   */
  async updateRole(id: number, data: UpdateRoleInput): Promise<Role> {
    const { permissionIds, ...roleData } = data;

    return await prisma.$transaction(async (tx: PrismaTransaction) => {
      // If permissionIds are provided, replace all existing permissions
      if (permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });
      }

      return await tx.role.update({
        where: { id },
        data: {
          ...roleData,
          ...(permissionIds && {
            permissions: {
              create: permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            },
          }),
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    });
  }

  /**
   * Performs soft deletion of a role in the database.
   * This method marks the role as deleted without removing it
   * from the database to maintain data integrity.
   *
   * Database Operations:
   * - Updates deleted flag to true
   * - Sets deletedAt timestamp
   * - Preserves all role data and relationships
   */
  async deleteRole(id: number): Promise<Role> {
    return await prisma.role.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }

  /**
   * Performs soft deletion of multiple roles in a single operation.
   * This method provides efficient bulk deletion for administrative
   * operations and cleanup tasks.
   *
   * Database Operations:
   * - Updates multiple roles in a single query
   * - Only affects non-deleted roles
   * - Sets deleted flag and timestamp for all affected roles
   * - Returns count of affected records
   */
  async bulkDeleteRoles(ids: number[]): Promise<{ deletedCount: number }> {
    const result = await prisma.role.updateMany({
      where: {
        id: { in: ids },
        deleted: false,
      },
      data: { deleted: true, deletedAt: new Date() },
    });

    return { deletedCount: result.count };
  }

  /**
   * Retrieves a role with their complete permission hierarchy.
   * This method is essential for authorization systems as it provides
   * the complete access control context for a role.
   *
   * Database Operations:
   * - Fetches role with nested permission relationships
   * - Uses complex join operations for efficiency
   * - Returns null if role not found
   */
  async findRoleWithPermissions(id: number): Promise<Role | null> {
    return prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * Assigns permissions to a role, replacing any existing permissions.
   * This method provides complete control over role permissions
   * by removing all existing assignments and creating new ones.
   *
   * All operations are performed in a single transaction to ensure
   * atomicity. If any operation fails, all changes are rolled back.
   *
   * Database Operations:
   * - Removes all existing role-permission relationships
   * - Creates new role-permission relationships for provided IDs
   * - Returns role with updated permission information
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    return await prisma.$transaction(async (tx: PrismaTransaction) => {
      // First, remove existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Then assign the new permissions
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });

      // Return the role with its permissions
      return (await tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })) as Role;
    });
  }

  /**
   * Removes specific permissions from a role.
   * This method allows selective permission removal without
   * affecting other assigned permissions.
   *
   * All operations are performed in a single transaction to ensure
   * atomicity and data consistency.
   *
   * Database Operations:
   * - Removes specific role-permission relationships
   * - Preserves other assigned permissions
   * - Returns role with updated permission information
   */
  async removePermissionsFromRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    return await prisma.$transaction(async (tx: PrismaTransaction) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId,
          permissionId: { in: permissionIds },
        },
      });

      return (await tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true }
          }
        },
      })) as Role;
    });
  }

  async getRolesWithPermissions(
    params: PaginationParams,
    restaurantId?: string,
    includeSystem: boolean = false,
  ): Promise<PaginatedResponse<Role>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted: false };
    
    if (restaurantId && !includeSystem) {
      where.restaurantId = restaurantId;
    } else if (restaurantId && includeSystem) {
      where.OR = [
        { restaurantId },
        { restaurantId: null }
      ];
    } else if (!restaurantId && !includeSystem) {
      where.restaurantId = null;
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true }
          }
        },
      }),
      prisma.role.count({
        where,
      }),
    ]);

    return createPaginatedResponse(roles, total, params);
  }
}

export default new RoleRepository();
