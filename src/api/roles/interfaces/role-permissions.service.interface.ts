import { Role } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";

export interface RolePermissionServiceInterface {
  /**
   * Retrieves a specific role with all its associated permissions.
   *
   * @param id - Role ID (integer)
   * @returns Promise<Role> - Role object with permissions if found
   */
  findRoleWithPermissions(id: number): Promise<Role>;

  /**
   * Assigns permissions to a specific role. This operation replaces
   * all existing permissions for the role with the new set provided.
   *
   * @param roleId - Role ID to assign permissions to
   * @param permissionIds - Array of permission IDs to assign
   * @returns Promise<Role> - Updated role with new permissions
   */
  assignPermissionsToRole(
    roleId: number,
    permissionIds: number[],
    isSuperAdmin?: boolean,
  ): Promise<Role>;

  /**
   * Removes specific permissions from a role. This operation only
   * removes the specified permissions, leaving other permissions intact.
   *
   * @param roleId - Role ID to remove permissions from
   * @param permissionIds - Array of permission IDs to remove
   * @param isSuperAdmin - Whether the requesting user is a SuperAdmin
   * @returns Promise<Role> - Updated role with remaining permissions
   */
  removePermissionsFromRole(
    roleId: number,
    permissionIds: number[],
    isSuperAdmin?: boolean,
  ): Promise<Role>;

  /**
   * Retrieves a paginated list of all roles with their associated permissions.
   *
   * @param params - Pagination parameters (page, limit)
   * @returns Promise<PaginatedResponse<Role>> - Paginated roles with permissions data
   */
  getRolesWithPermissions(
    params: PaginationParams,
    restaurantId?: string,
    includeSystem?: boolean,
  ): Promise<PaginatedResponse<Role>>;
}
