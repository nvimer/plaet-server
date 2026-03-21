import { Permission } from "@prisma/client";
import { PermissionServiceInterface } from "./interfaces/permission.service.interface";
import { PermissionRepositoryInterface } from "./interfaces/permission.repository.interface";
import {
  CreatePermissionInput,
  PermissionSearchParams,
  BulkPermissionInput,
  UpdatePermissionInput,
} from "./permission.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import permissionRepository from "./permission.repository";
import { CustomError } from "../../types/custom-errors";

/**
 * Service class for Permission business logic
 * Handles all business operations and validation for permissions
 */
export class PermissionService implements PermissionServiceInterface {
  constructor(
    private readonly permissionRepository: PermissionRepositoryInterface,
  ) {}

  /**
   * Get all permissions with pagination
   */
  async findAllPermissions(
    params: PaginationParams,
    includeSystem: boolean = true,
  ): Promise<PaginatedResponse<Permission>> {
    return this.permissionRepository.findAll(params, includeSystem);
  }

  /**
   * Get a permission by ID
   * @throws CustomError if permission not found
   */
  async findPermissionById(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new CustomError(
        `Permission with ID ${id} not found`,
        404,
        "PERMISSION_NOT_FOUND",
      );
    }
    return permission;
  }

  /**
   * Create a new permission
   * @throws CustomError if permission name already exists
   */
  async createPermission(data: CreatePermissionInput): Promise<Permission> {
    // Check for duplicate name
    await this.checkDuplicateName(data.name);

    return this.permissionRepository.create(data);
  }

  /**
   * Update an existing permission
   * @throws CustomError if permission not found or name already exists
   */
  async updatePermission(
    id: number,
    data: UpdatePermissionInput,
  ): Promise<Permission> {
    // Check if permission exists
    await this.findPermissionById(id);

    // Check for duplicate name if name is being updated
    if (data.name) {
      await this.checkDuplicateName(data.name, id);
    }

    return this.permissionRepository.update(id, data);
  }

  /**
   * Delete a permission (soft delete)
   * @throws CustomError if permission not found
   */
  async deletePermission(id: number): Promise<Permission> {
    // Check if permission exists
    await this.findPermissionById(id);

    return this.permissionRepository.delete(id);
  }

  /**
   * Bulk delete multiple permissions
   * @throws CustomError if any permission not found
   */
  async bulkDeletePermissions(data: BulkPermissionInput): Promise<number> {
    const { ids } = data;

    // Check if all permissions exist
    for (const id of ids) {
      await this.findPermissionById(id);
    }

    return this.permissionRepository.bulkDelete(ids);
  }

  /**
   * Search permissions with filtering and pagination
   */
  async searchPermissions(
    params: PaginationParams & PermissionSearchParams,
    includeSystem: boolean = true,
  ): Promise<PaginatedResponse<Permission>> {
    return this.permissionRepository.search(params, includeSystem);
  }

  /**
   * Check for duplicate permission name
   * @throws CustomError if duplicate name found
   */
  private async checkDuplicateName(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existingPermission = await this.permissionRepository.findByName(name);

    if (existingPermission && existingPermission.id !== excludeId) {
      throw new CustomError(
        `A permission with the name '${name}' already exists`,
        409,
        "DUPLICATE_PERMISSION_NAME",
      );
    }
  }
}

export default new PermissionService(permissionRepository);
