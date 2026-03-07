import { User } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { UpdateUserInput, UserSearchParams } from "../user.validator";
import { RegisterInput } from "../../auth/auth.validator";
import { AuthenticatedUser } from "../../../types/express";
import { UserWithRoles } from "../user.repository";

export interface UserRepositoryInterface {
  findAll(
    params: PaginationParams,
    restaurantId?: string,
  ): Promise<PaginatedResponse<UserWithRoles>>;
  search(
    params: PaginationParams & UserSearchParams,
    restaurantId?: string,
  ): Promise<PaginatedResponse<UserWithRoles>>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: RegisterInput & { restaurantId?: string }): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  findUserWithPermissions(id: string): Promise<AuthenticatedUser | null>;
}
