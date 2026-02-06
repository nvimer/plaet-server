import { z } from "zod";

/**
 * DailyMenu Validator Schemas
 * Zod validation schemas for daily menu endpoints
 */

/**
 * Schema for updating daily menu body
 */
export const updateDailyMenuBodySchema = z.object({
  side: z
    .string()
    .min(1, "Side dish is required")
    .max(200, "Side dish must be less than 200 characters"),
  soup: z
    .string()
    .min(1, "Soup is required")
    .max(200, "Soup must be less than 200 characters"),
  drink: z
    .string()
    .min(1, "Drink is required")
    .max(200, "Drink must be less than 200 characters"),
  dessert: z
    .string()
    .max(200, "Dessert must be less than 200 characters")
    .optional(),
});

/**
 * Schema for date parameter in URL
 */
export const dailyMenuDateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format",
  }),
});

/**
 * Type definitions for validated inputs
 */
export type UpdateDailyMenuBodyInput = z.infer<
  typeof updateDailyMenuBodySchema
>;
export type UpdateDailyMenuDateInput = z.infer<
  typeof dailyMenuDateParamSchema
>;
