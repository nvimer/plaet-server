import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { UpdateProfileInput } from "../profile.validator";
import { UserWithProfile } from "../../../types/prisma.types";

export interface ProfileRepositoryInterface {
  findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<UserWithProfile>>;
  findById(id: string): Promise<UserWithProfile | null>;
  update(id: string, data: UpdateProfileInput): Promise<UserWithProfile>;
  updatePhoto(
    userId: string,
    photoUrl: string,
    imagePublicId: string,
  ): Promise<UserWithProfile>;
}
