import { User } from "@prisma/client";
import profileRepository from "./profile.repository";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { ProfileServiceInterface } from "./interfaces/profile.service.interface";
import { ProfileRepositoryInterface } from "./interfaces/profile.repository.interface";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { UpdateProfileInput } from "./profile.validator";
import { UserWithProfile } from "../../types/prisma.types";
import { storageService } from "../../services/storage.service";

/**
 * Profile Service
 *
 * Core business logic layer for user profile management operations.
 */
export class ProfileServices implements ProfileServiceInterface {
  constructor(private profileRepository: ProfileRepositoryInterface) {}

  /**
   * Validates that a user/profile exists by ID and returns the user if found.
   * This method is used across multiple operations to ensure
   * the user exists before performing any modifications.
   */
  private async findByIdOrFail(id: string): Promise<UserWithProfile> {
    const user = await this.profileRepository.findById(id);

    if (!user)
      throw new CustomError(
        `User with ID ${id} not found.`,
        HttpStatus.NOT_FOUND,
        "ID_NOT_FOUND",
      );
    return user;
  }

  /**
   * Retrieves a paginated list of all user profiles in the system.
   * This method supports pagination for efficient data retrieval
   * and is typically used for administrative interfaces.
   */
  async findAll(params: PaginationParams): Promise<PaginatedResponse<User>> {
    return this.profileRepository.findAll(params);
  }

  /**
   * Retrieves a specific user profile by their unique identifier.
   * This method validates the user exists before returning the data.
   */
  async findById(id: string): Promise<UserWithProfile> {
    return this.findByIdOrFail(id);
  }

  /**
   * Updates an existing user's profile information.
   * This method supports partial updates and includes validation
   * to ensure data integrity and uniqueness.
   */
  async updateUser(
    id: string,
    data: UpdateProfileInput,
  ): Promise<UserWithProfile> {
    await this.findByIdOrFail(id);
    return this.profileRepository.update(id, data);
  }

  /**
   *  Retrieves the authenticated user's own profile.
   *  This method is user for the /profiles/me endpoint.
   *
   *  @param id - ID from the authenticated token (req.user.id)
   *  @returs Promise<UserWithProfile> - User's complete profile
   */

  async getMyProfile(id: string): Promise<UserWithProfile> {
    return this.findByIdOrFail(id);
  }

  /**
   * Updates the user's profile photo.
   * Uploads new photo to Cloudinary (handled by middleware) and updates DB.
   * Deletes the old photo from Cloudinary if it exists.
   */
  async updatePhoto(
    userId: string,
    file: Express.Multer.File, // Using generic type, assumed to be handled by multer
  ): Promise<UserWithProfile> {
    const user = await this.findByIdOrFail(userId);

    // If user already has a photo, delete it from Cloudinary to save space
    if (user.profile?.imagePublicId) {
      await storageService.deleteImage(user.profile.imagePublicId);
    }

    // The file is already uploaded by the middleware.
    // multer-storage-cloudinary provides 'path' as the secure_url and 'filename' as public_id
    const photoUrl = file.path;
    const imagePublicId = file.filename;

    return this.profileRepository.updatePhoto(userId, photoUrl, imagePublicId);
  }
}

export default new ProfileServices(profileRepository);
