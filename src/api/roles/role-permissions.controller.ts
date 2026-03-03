import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import rolePermissionService from "./role-permissions.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { PaginationParams } from "../../interfaces/pagination.interfaces";
import { logger } from "../../config/logger";

/**
 * Role Permission Controller
 */
class RolePermissionController {
  /**
   * GET /roles/permissions/:id
   *
   * Retrieves a specific role with all its associated permissions.
   * This endpoint is essential for role management interfaces and
   * permission auditing purposes.
   *
   * Response:
   * - 200: Role with permissions found and returned
   * - 400: Invalid ID format
   * - 404: Role not found
   */
  getRoleWithPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const role = await rolePermissionService.findRoleWithPermissions(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Role with permissions fetched successfully",
      data: role,
    });
  });

  /**
   * POST /roles/permissions/:id/assign
   *
   * Assigns permissions to a specific role. This operation replaces
   * all existing permissions for the role with the new set provided.
   *
   * Response:
   * - 202: Permissions assigned to role successfully
   * - 400: Invalid request body or ID format
   * - 404: Role not found
   * - 409: Invalid permission IDs provided
   */
  assignPermissionsToRole = asyncHandler(
    async (req: Request, res: Response) => {
      const roleId = parseInt(req.params.id);
      const { permissionIds } = req.body;
      const role = await rolePermissionService.assignPermissionsToRole(
        roleId,
        permissionIds,
      );
      res.status(HttpStatus.ACCEPTED).json({
        success: true,
        message: "Permissions assigned to role successfully",
        data: role,
      });
    },
  );

  /**
   * DELETE /roles/permissions/:id/remove
   *
   * Removes specific permissions from a role. This operation only
   * removes the specified permissions, leaving other permissions intact.
   *
   * Response:
   * - 202: Permissions removed from role successfully
   * - 400: Invalid request body or ID format
   * - 404: Role not found
   */
  removePermissionsFromRole = asyncHandler(
    async (req: Request, res: Response) => {
      const roleId = parseInt(req.params.id);
      const { permissionIds } = req.body;

      const role = await rolePermissionService.removePermissionsFromRole(
        roleId,
        permissionIds,
      );
      res.status(HttpStatus.ACCEPTED).json({
        success: true,
        message: "Permissions removed from role successfully",
        data: role,
      });
    },
  );

  /**
   * GET /roles/permissions
   *
   * Retrieves a paginated list of all roles with their associated permissions.
   * This endpoint is useful for administrative interfaces and permission
   * management dashboards.
   *
   * Response:
   * - 200: Success with paginated roles and permissions data
   * - 400: Invalid pagination parameters
   */
  getRolesWithPermissions = asyncHandler(
    async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const params: PaginationParams = { page, limit };

      const roles = await rolePermissionService.getRolesWithPermissions(params);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Roles with permissions fetched successfully",
        data: roles.data,
        meta: roles.meta,
      });
    },
  );
}

export default new RolePermissionController();
