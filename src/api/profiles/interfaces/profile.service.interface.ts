import { User } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { UpdateProfileInput } from "../profile.validator";
import { UserWithProfile } from "../../../types/prisma.types";

export interface ProfileServiceInterface {
  findAll(params: PaginationParams): Promise<PaginatedResponse<User>>;
  findById(id: string): Promise<UserWithProfile>;
  updateUser(id: string, data: UpdateProfileInput): Promise<UserWithProfile>;
  getMyProfile(id: string): Promise<UserWithProfile>;
  updatePhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserWithProfile>;
}
