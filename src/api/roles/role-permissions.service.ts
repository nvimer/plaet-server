import { Role } from "@prisma/client";
import roleRepository from "./role.repository";
import permissionRepository from "../permissions/permission.repository";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { RolePermissionServiceInterface } from "./interfaces/role-permissions.service.interface";
import { RoleRepositoryInterface } from "./interfaces/role.repository.interface";
import { PermissionRepositoryInterface } from "../permissions/interfaces/permission.repository.interface";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";

/**
 * Role Permission Service
 */
export class RolePermissionService implements RolePermissionServiceInterface {
  constructor(
    private roleRepository: RoleRepositoryInterface,
    private permissionRepository: PermissionRepositoryInterface,
  ) {}

  /**
   * Validates that a role exists with permissions and returns the role if found.
   * This method is used across multiple operations to ensure
   * the role exists before performing any permission modifications.
   */
  private async findRoleWithPermissionsOrFail(id: number): Promise<Role> {
    const role = await this.roleRepository.findRoleWithPermissions(id);

    if (!role)
      throw new CustomError(
        `Role with ID ${id} not found.`,
        HttpStatus.NOT_FOUND,
        "ID_NOT_FOUND",
      );
    return role;
  }

  /**
   * Retrieves a specific role with all its associated permissions.
   * This method validates the role exists before returning the data.
   */
  async findRoleWithPermissions(id: number): Promise<Role> {
    return this.findRoleWithPermissionsOrFail(id);
  }

  /**
   * Assigns permissions to a specific role. This operation replaces
   * all existing permissions for the role with the new set provided.
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionIds: number[],
    isSuperAdmin: boolean = false,
  ): Promise<Role> {
    await this.findRoleWithPermissionsOrFail(roleId);

    // Security check: Only SuperAdmins can assign system permissions
    if (!isSuperAdmin) {
      for (const id of permissionIds) {
        const permission = await this.permissionRepository.findById(id);
        if (permission?.isSystem) {
          throw new CustomError(
            `Unauthorized: Only SuperAdmins can assign system permission '${permission.name}'.`,
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
          );
        }
      }
    }

    return this.roleRepository.assignPermissionsToRole(roleId, permissionIds);
  }

  /**
   * Removes specific permissions from a role. This operation only
   * removes the specified permissions, leaving other permissions intact.
   */
  async removePermissionsFromRole(
    roleId: number,
    permissionIds: number[],
    isSuperAdmin: boolean = false,
  ): Promise<Role> {
    await this.findRoleWithPermissionsOrFail(roleId);

    // Security check: Only SuperAdmins can remove system permissions
    if (!isSuperAdmin) {
      for (const id of permissionIds) {
        const permission = await this.permissionRepository.findById(id);
        if (permission?.isSystem) {
          throw new CustomError(
            `Unauthorized: Only SuperAdmins can remove system permission '${permission.name}'.`,
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
          );
        }
      }
    }

    return this.roleRepository.removePermissionsFromRole(roleId, permissionIds);
  }

  /**
   * Retrieves a paginated list of all roles with their associated permissions.
   * This method supports pagination for efficient data retrieval
   * and is typically used for administrative interfaces.
   */
  async getRolesWithPermissions(
    params: PaginationParams,
  ): Promise<PaginatedResponse<Role>> {
    return this.roleRepository.getRolesWithPermissions(params);
  }
}

export default new RolePermissionService(roleRepository, permissionRepository);
