import "dotenv/config";
import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  PORT: z.string().default("8080"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string(),
  DATABASE_URL: z.string(),
  TEST_DATABASE_URL: z.string().optional(), // Make optional for production
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SALT_ROUNDS: z.coerce.number().default(10),
  JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().default(30),
  JWT_ACCESS_EXPIRATION_DAYS: z.coerce.number().default(7),
  ALLOWED_ORIGINS: z.string(),
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error(
    "⚠️ Environment variable validation warning:",
    parsedEnv.error.flatten().fieldErrors,
  );

  // In production, we log but don't necessarily crash if we have the critical ones
  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE_URL) {
      logger.error("❌ CRITICAL: DATABASE_URL is missing. The app WILL fail.");
    }
  }
}

// Extract data with fallbacks to process.env if validation failed
const envData = parsedEnv.success ? parsedEnv.data : process.env;

export const config = {
  port: parseInt((envData.PORT as string) || "8080", 10),
  nodeEnv: (envData.NODE_ENV as "development" | "production" | "test") || "production",
  appUrl: (envData.APP_URL as string) || "https://api.plaet.cloud",
  databaseUrl: (envData.DATABASE_URL as string) || "",
  testDatabaseUrl: (envData.TEST_DATABASE_URL as string) || "",
  jwtSecret: (envData.JWT_SECRET as string) || "default_secret_for_emergency_only_change_in_prod",
  saltRounds: parseInt((envData.SALT_ROUNDS as string) || "10", 10),
  jwtAccessExpirationMinutes: parseInt((envData.JWT_ACCESS_EXPIRATION_MINUTES as string) || "30", 10),
  jwtAccessExpirationDays: parseInt((envData.JWT_ACCESS_EXPIRATION_DAYS as string) || "7", 10),
  allowedOrigins: (envData.ALLOWED_ORIGINS as string) || "https://plaet.cloud,https://www.plaet.cloud",
  // Cloudinary
  cloudinaryCloudName: envData.CLOUDINARY_CLOUD_NAME as string,
  cloudinaryApiKey: envData.CLOUDINARY_API_KEY as string,
  cloudinaryApiSecret: envData.CLOUDINARY_API_SECRET as string,
};

export type AppConfig = typeof config;
