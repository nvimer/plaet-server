import "dotenv/config";
import { z } from "zod";
import { logger } from "./logger";

// Debug: log SMTP env vars
logger.info("[CONFIG] SMTP_HOST in process.env:", process.env.SMTP_HOST);
logger.info("[CONFIG] SMTP_PORT in process.env:", process.env.SMTP_PORT);
logger.info("[CONFIG] SMTP_USER in process.env:", process.env.SMTP_USER ? "defined" : "undefined");

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
  // Email Configuration (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional().default("false"),
  FROM_EMAIL: z.string().optional(),
  CLIENT_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

/**
 * Clean environment values (remove literal quotes and whitespace)
 */
const cleanEnvValue = (value: string | undefined): string | undefined => {
  if (!value) return value;
  return value.trim().replace(/^["']|["']$/g, "");
};

if (!parsedEnv.success) {
  logger.error(
    "❌ Invalid environment variables:",
    parsedEnv.error.flatten().fieldErrors,
  );

  // In production, show specific missing variables
  if (process.env.NODE_ENV === "production") {
    logger.error("🔧 Production Environment - Missing Variables:");

    if (!process.env.JWT_SECRET) {
      logger.error("❌ JWT_SECRET is required in production");
    }
    if (!process.env.DATABASE_URL) {
      logger.error("❌ DATABASE_URL is required in production");
    }
    if (!process.env.APP_URL) {
      logger.error("❌ APP_URL is required in production");
    }
    if (!process.env.ALLOWED_ORIGINS) {
      logger.error("❌ ALLOWED_ORIGINS is required in production");
    }

    // Log valores actuales (sin secretos)
    logger.info("📋 Current Environment (sensitive):", {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      APP_URL: process.env.APP_URL || "MISSING",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "MISSING",
      JWT_SECRET_SET: process.env.JWT_SECRET ? "YES" : "NO",
    });
  }

  throw new Error("Invalid environment variables");
}

export const config = {
  port: parseInt(parsedEnv.data.PORT, 10),
  nodeEnv: parsedEnv.data.NODE_ENV,
  appUrl: parsedEnv.data.APP_URL,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  testDatabaseUrl: parsedEnv.data.TEST_DATABASE_URL,
  jwtSecret: cleanEnvValue(parsedEnv.data.JWT_SECRET)!,
  saltRounds: parsedEnv.data.SALT_ROUNDS,
  jwtAccessExpirationMinutes: parsedEnv.data.JWT_ACCESS_EXPIRATION_MINUTES,
  jwtAccessExpirationDays: parsedEnv.data.JWT_ACCESS_EXPIRATION_DAYS,
  allowedOrigins: parsedEnv.data.ALLOWED_ORIGINS,
  // Cloudinary
  cloudinaryCloudName: parsedEnv.data.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: parsedEnv.data.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsedEnv.data.CLOUDINARY_API_SECRET,
  // SMTP
  smtp: {
    host: cleanEnvValue(parsedEnv.data.SMTP_HOST),
    port: parsedEnv.data.SMTP_PORT,
    user: cleanEnvValue(parsedEnv.data.SMTP_USER),
    pass: cleanEnvValue(parsedEnv.data.SMTP_PASS),
    secure: cleanEnvValue(parsedEnv.data.SMTP_SECURE) === "true",
    from: cleanEnvValue(parsedEnv.data.FROM_EMAIL),
  },
  clientUrl:
    cleanEnvValue(parsedEnv.data.CLIENT_URL) ||
    cleanEnvValue(parsedEnv.data.APP_URL),
};

export type AppConfig = typeof config;
