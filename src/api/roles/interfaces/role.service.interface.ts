import { Role } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { CreateRoleInput, UpdateRoleInput } from "../role.validator";

export interface RoleServiceInterface {
  findAll(
    params: PaginationParams,
    restaurantId?: string,
    includeSystem?: boolean,
  ): Promise<PaginatedResponse<Role>>;
  searchRoles(
    params: PaginationParams,
    search: string,
    active?: boolean,
    restaurantId?: string,
    includeSystem?: boolean,
  ): Promise<PaginatedResponse<Role>>;
  findById(id: number): Promise<Role>;
  createRole(data: CreateRoleInput): Promise<Role>;
  updateRole(id: number, data: UpdateRoleInput): Promise<Role>;
  deleteRole(id: number): Promise<Role>;
  bulkDeleteRoles(ids: number[]): Promise<{ deletedCount: number }>;
}
