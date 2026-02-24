import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import profileService from "./profile.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { PaginationParams } from "../../interfaces/pagination.interfaces";
import { UpdateProfileInput } from "./profile.validator";
import { logger } from "../../config/logger";
import { CustomError } from "../../types/custom-errors";

/**
 * Profile Controller
 */
class ProfileController {
  /**
   * GET /profiles
   *
   * Retrieves a paginated list of all user profiles in the system.
   * This endpoint is typically used for administrative purposes
   * and user management interfaces.
   *
   * Query Parameters:
   * - page: Page number for pagination (defaults to 1)
   * - limit: Number of items per page (defaults to 10)
   *
   * Response:
   * - 200: Success with paginated profiles data
   * - 400: Invalid pagination parameters
   *
   */
  getProfiles = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const params: PaginationParams = { page, limit };

    const profiles = await profileService.findAll(params);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Profiles fetched successfully",
      data: profiles.data,
      meta: profiles.meta,
    });
  });

  /**
   * GET /profiles/:id
   *
   * Retrieves a specific user profile by its unique identifier.
   * This endpoint is used for profile details and editing interfaces.
   *
   * URL Parameters:
   * - id: Profile ID (UUID string)
   *
   * Response:
   * - 200: Profile found and returned
   * - 400: Invalid ID format
   * - 404: Profile not found
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    const profile = await profileService.findById(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Profile fetched successfully",
      data: profile,
    });
  });

  /**
   * PATCH /profiles/:id
   *
   * Updates an existing user profile's information.
   * This endpoint supports partial updates, allowing clients
   * to update only specific profile fields without affecting others.
   *
   * URL Parameters:
   * - id: Profile ID (UUID string)
   *
   * Request Body (all fields optional):
   * - firstName: User's first name
   * - lastName: User's last name
   * - email: User's email address (must be unique if changed)
   * - phone: User's phone number
   * - Additional profile-specific fields
   *
   * Response:
   * - 202: Profile updated successfully
   * - 400: Invalid request data
   * - 404: Profile not found
   * - 409: Email already exists (if email is being changed)
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const data: UpdateProfileInput = req.body;

    logger.info(`aqui si llega el id:  ${id}`);
    const profileUpdated = await profileService.updateUser(id, data);

    res.status(HttpStatus.ACCEPTED).json({
      success: true,
      message: "Profile updated successfully",
      data: profileUpdated,
    });
  });
  /**
   * GET /profiles/me
   *
   * Retrieves the authenticated user's own profile.
   * This endpoint uses the JWT token to identify the user.
   *
   * Headers:
   * - Authorization: Bearer <JWT_TOKEN> (required)
   *
   * Response
   * - 200: Profile found and returned (without password)
   * - 401: Not authenticated
   * - 404: Profile not found
   */
  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    // req.user comes to middleware of authentication (authJwt)
    const id = req.user.id;
    const profile = await profileService.getMyProfile(id);

    const { password: _password, ...data } = profile;
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Profile fetched successfully",
      data: data,
    });
  });

  /**
   * PATCH /profiles/me/photo
   *
   * Uploads or updates the authenticated user's profile photo.
   *
   * Headers:
   * - Authorization: Bearer <JWT_TOKEN> (required)
   * - Content-Type: multipart/form-data
   *
   * Body:
   * - photo: Image file (jpg, png, webp)
   *
   * Response:
   * - 200: Photo updated successfully
   * - 400: File validation error
   */
  uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new CustomError("No file uploaded", HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.id;
    const updatedProfile = await profileService.updatePhoto(userId, req.file);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Profile photo updated successfully",
      data: updatedProfile,
    });
  });
}

export default new ProfileController();
