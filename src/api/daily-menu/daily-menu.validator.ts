import { z } from "zod";

/**
 * DailyMenu Validator Schemas - Updated for Item-Based Daily Menu
 * Zod validation schemas for daily menu endpoints with MenuItem references
 */

/**
 * Schema for item option input
 */
const itemOptionSchema = z.object({
  option1Id: z.number().int().positive().optional().nullable(),
  option2Id: z.number().int().positive().optional().nullable(),
  option3Id: z.number().int().positive().optional().nullable(),
});

/**
 * Schema for updating daily menu configuration
 */
export const updateDailyMenuBodySchema = z.object({
  // Prices
  basePrice: z.number().positive().optional(),
  premiumProteinPrice: z.number().positive().optional(),

  // Category IDs
  soupCategoryId: z.number().int().positive().optional().nullable(),
  principleCategoryId: z.number().int().positive().optional().nullable(),
  proteinCategoryId: z.number().int().positive().optional().nullable(),
  drinkCategoryId: z.number().int().positive().optional().nullable(),
  extraCategoryId: z.number().int().positive().optional().nullable(),
  saladCategoryId: z.number().int().positive().optional().nullable(),
  dessertCategoryId: z.number().int().positive().optional().nullable(),

  // Item options for each category
  soupOptions: itemOptionSchema.optional(),
  principleOptions: itemOptionSchema.optional(),
  drinkOptions: itemOptionSchema.optional(),
  extraOptions: itemOptionSchema.optional(),
  saladOptions: itemOptionSchema.optional(),
  dessertOptions: itemOptionSchema.optional(),

  // All available protein IDs (array replaces proteinOptions)
  allProteinIds: z.array(z.number().int().positive()).optional(),
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
export type UpdateDailyMenuDateInput = z.infer<typeof dailyMenuDateParamSchema>;
