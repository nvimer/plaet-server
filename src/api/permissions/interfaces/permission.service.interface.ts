import { Permission } from "@prisma/client";
import {
  CreatePermissionInput,
  UpdatePermissionInput,
  PermissionSearchParams,
  BulkPermissionInput,
} from "../permission.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";

/**
 * Permission Service Interface
 *
 * Defines the contract for permission business logic operations.
 */
export interface PermissionServiceInterface {
  /**
   * Retrieves all permissions with pagination support
   */
  findAllPermissions(
    params: PaginationParams,
    includeSystem?: boolean,
  ): Promise<PaginatedResponse<Permission>>;

  /**
   * Finds a specific permission by its unique ID
   */
  findPermissionById(id: number): Promise<Permission>;

  /**
   * Creates a new permission with validation
   */
  createPermission(data: CreatePermissionInput): Promise<Permission>;

  /**
   * Updates an existing permission with validation
   */
  updatePermission(
    id: number,
    data: UpdatePermissionInput,
  ): Promise<Permission>;

  /**
   * Soft deletes a permission by setting deleted flag
   */
  deletePermission(id: number): Promise<Permission>;

  /**
   * Bulk deletes multiple permissions in a single operation
   */
  bulkDeletePermissions(data: BulkPermissionInput): Promise<number>;

  /**
   * Searches permissions with filtering and pagination
   */
  searchPermissions(
    params: PaginationParams & PermissionSearchParams,
    includeSystem?: boolean,
  ): Promise<PaginatedResponse<Permission>>;
}
