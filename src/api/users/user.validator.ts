import { z } from "zod";
import { idParamsSchema } from "../../utils/params.schema";

export const userIdSchema = z.object({
  params: idParamsSchema,
});

export const updateUserSchema = z.object({
  body: z
    .object({
      firstName: z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(50, "First name cannot exceed 50 characters"),
      lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(50, "Last name cannot exceed 50 characters"),
      email: z.string().email("Invalid email address"),
      phone: z.string().regex(/^\d{10}$/, "Phone number must be a 10 digits"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
    })
    .partial(),
});

/**
 * Validation schema for searching users.
 * Validates search parameters for user search functionality.
 */
export const userSearchSchema = z.object({
  query: z.object({
    search: z
      .string()
      .min(1, "Search term must be at least 1 character")
      .max(100, "Search term must not exceed 100 characters")
      .trim()
      .optional(),
  }),
});

type UserIdParams = z.infer<typeof userIdSchema>["params"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type UserSearchParams = z.infer<typeof userSearchSchema>["query"];
