import { TokenType } from "@prisma/client";
import { z } from "zod";

/**
 * Token validation schema for individual token objects
 *
 * Validates the structure of individual tokens including
 * the token string and expiration date.
 */
export const tokenValidationSchema = z.object({
  token: z.string(),
  expires: z.string().date(),
});

/**
 * Authentication token response schema
 *
 * Validates the complete authentication token response structure
 * that includes both access and refresh tokens.
 */
export const authTokenResponseSchema = z.object({
  access: tokenValidationSchema,
  refresh: tokenValidationSchema,
});

/**
 * Token type enumeration validation
 *
 * Creates a Zod enum from the Prisma TokenType enum
 * to ensure only valid token types are accepted.
 */
const tokenType = z.enum(
  Object.values(TokenType) as [TokenType, ...TokenType[]],
);

/**
 * JWT payload validation schema
 *
 * Validates structure of JWT token payloads to ensure
 * they contain all required fields with proper types.
 */
export const payloadSchema = z.object({
  sub: z.string().uuid(),
  iat: z.coerce.number(),
  exp: z.coerce.number(),
  type: tokenType,
  token: z.string().optional(),
});

export type TokenValidationInput = z.infer<typeof tokenValidationSchema>;
export type AuthTokenResponseInput = z.infer<typeof authTokenResponseSchema>;
export type PayloadInput = z.infer<typeof payloadSchema>;
