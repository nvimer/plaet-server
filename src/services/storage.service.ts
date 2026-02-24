import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { config } from "../config";
import { logger } from "../config/logger";

// Configure Cloudinary
if (
  config.cloudinaryCloudName &&
  config.cloudinaryApiKey &&
  config.cloudinaryApiSecret
) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });
  logger.info("✅ Cloudinary configured successfully");
} else {
  logger.warn(
    "⚠️ Cloudinary credentials missing. File uploads will fail or be disabled.",
  );
}

/**
 * Multer storage engine for Cloudinary
 * Automatically handles file uploads during request processing
 */
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req: any, file: any) => {
      // Dynamic folder based on route or type?
      // Simple default: 'plaet/uploads'
      return "plaet/uploads";
    },
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }], // Basic optimization
  } /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ as any, // Type casting needed due to library type definitions
});

/**
 * Deletes an image from Cloudinary
 * @param publicId The public ID of the image to delete
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok") {
      logger.warn(`Failed to delete image ${publicId}: ${result.result}`);
    } else {
      logger.info(`Deleted image: ${publicId}`);
    }
  } catch (error) {
    logger.error(`Error deleting image ${publicId}:`, error);
    // Don't throw, just log. Deletion failure shouldn't crash the main flow.
  }
};

export const storageService = {
  storage,
  deleteImage,
};
