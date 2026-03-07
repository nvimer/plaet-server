import { User } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { UpdateUserInput, UserSearchParams } from "../user.validator";
import { RegisterInput } from "../../auth/auth.validator";
import { AuthenticatedUser } from "../../../types/express";
import { UserWithRoles } from "../user.repository";

export interface UserServiceInterface {
  findAll(
    params: PaginationParams,
    restaurantId?: string,
  ): Promise<PaginatedResponse<UserWithRoles>>;
  searchUsers(
    params: PaginationParams & UserSearchParams,
    restaurantId?: string,
  ): Promise<PaginatedResponse<UserWithRoles>>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User>;
  register(data: RegisterInput, restaurantId?: string): Promise<User>;
  updateUser(id: string, data: UpdateUserInput): Promise<User>;
  findUserWithRolesAndPermissions(
    id: string,
  ): Promise<AuthenticatedUser | null>;
}
