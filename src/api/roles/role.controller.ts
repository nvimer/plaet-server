import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import roleService from "./role.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CreateRoleInput, UpdateRoleInput } from "./role.validator";
import { PaginationParams } from "../../interfaces/pagination.interfaces";
import { AuthenticatedUser } from "../../types/express";
import { RoleName } from "@prisma/client";

/**
 * Role Controller
 */
class RoleController {
  /**
   * GET /roles
   *
   * Retrieves a paginated list of all roles in the system.
   * This endpoint is typically used for role management interfaces
   * and administrative purposes.
   *
   * Query Parameters:
   * - page: Page number for pagination (defaults to 1)
   * - limit: Number of items per page (defaults to 10)
   *
   * Response:
   * - 200: Success with paginated roles data
   * - 400: Invalid pagination parameters
   */
  getRoles = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const user = req.user as AuthenticatedUser;
    const isSuperAdmin = user.roles.some(r => r.role.name === RoleName.SUPERADMIN);

    const params: PaginationParams = { page, limit };

    const roles = await roleService.findAll(
      params, 
      user.restaurantId || undefined, 
      isSuperAdmin
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Roles fetched successfully",
      data: roles.data,
      meta: roles.meta,
    });
  });

  /**
   * GET /roles/search
   *
   * Searches and filters roles based on various criteria.
   * This endpoint provides advanced filtering capabilities for
   * role management and administrative interfaces.
   *
   * Query Parameters:
   * - page: Page number for pagination (defaults to 1)
   * - limit: Number of items per page (defaults to 10)
   * - search: Text search term for role name or description
   * - active: Filter by active status (true/false/undefined for all)
   *
   * Response:
   * - 200: Success with filtered and paginated roles data
   * - 400: Invalid search parameters
   */
  searchRoles = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const user = req.user as AuthenticatedUser;
    const isSuperAdmin = user.roles.some(r => r.role.name === RoleName.SUPERADMIN);

    const active =
      req.query.active === "true"
        ? true
        : req.query.active === "false"
          ? false
          : undefined;

    const params: PaginationParams = { page, limit };

    const roles = await roleService.searchRoles(
      params, 
      search, 
      active, 
      user.restaurantId || undefined, 
      isSuperAdmin
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Roles searched successfully",
      data: roles.data,
      meta: roles.meta,
    });
  });

  /**
   * GET /roles/:id
   *
   * Retrieves a specific role by its unique identifier.
   * This endpoint is used for role details and editing interfaces.
   *
   * Response:
   * - 200: Role found and returned
   * - 400: Invalid ID format
   * - 404: Role not found
   */
  getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const role = await roleService.findById(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Role fetched successfully",
      data: role,
    });
  });

  /**
   * POST /roles
   *
   * Creates a new role in the system.
   * This endpoint handles role creation with optional permission assignments
   * and validation of role name uniqueness.
   *
   * Response:
   * - 201: Role created successfully
   * - 400: Invalid request data
   * - 409: Role name already exists
   */
  postRole = asyncHandler(async (req: Request, res: Response) => {
    const data: CreateRoleInput = req.body;

    const role = await roleService.createRole(data);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  });

  /**
   * PATCH /roles/:id
   *
   * Updates an existing role's information.
   * This endpoint supports partial updates, allowing clients
   * to update only specific fields without affecting others.
   *
   * Response:
   * - 202: Role updated successfully
   * - 400: Invalid request data
   * - 404: Role not found
   * - 409: Role name already exists (if name is being changed)
   */
  patchRole = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: UpdateRoleInput = req.body;

    const role = await roleService.updateRole(id, data);
    res.status(HttpStatus.ACCEPTED).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  });

  /**
   * DELETE /roles/:id
   *
   * Deletes a specific role from the system.
   * This endpoint performs soft deletion to maintain data integrity
   * and preserve historical relationships.
   *
   * Response:
   * - 200: Role deleted successfully
   * - 400: Invalid ID format
   * - 404: Role not found
   * - 409: Role cannot be deleted (has active users)
   */
  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const role = await roleService.deleteRole(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Role deleted successfully",
      data: role,
    });
  });

  /**
   * DELETE /roles/bulk
   *
   * Deletes multiple roles in a single operation.
   * This endpoint provides efficient bulk deletion for administrative
   * operations and cleanup tasks.
   *
   * Response:
   * - 200: Bulk deletion completed
   * - 400: Invalid request data
   * - 409: Some roles cannot be deleted (have active users)
   */
  bulkDeleteRoles = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;

    const result = await roleService.bulkDeleteRoles(ids);
    res.status(HttpStatus.OK).json({
      success: true,
      message: `${result.deletedCount} roles deleted successfully`,
      data: result,
    });
  });
}

export default new RoleController();
