import { z } from "zod";
import { idParamsSchema } from "../../utils/params.schema";

export const restaurantIdSchema = z.object({
  params: idParamsSchema,
});

export const createRestaurantSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Restaurant name must be at least 2 characters long")
      .max(100, "Restaurant name cannot exceed 100 characters"),
    address: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    nit: z.string().max(20).optional(),
    currency: z.string().default("COP"),
    timezone: z.string().default("America/Bogota"),
    adminUser: z.object({
      firstName: z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(50, "First name cannot exceed 50 characters"),
      lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(50, "Last name cannot exceed 50 characters"),
      email: z.string().email("Invalid email address"),
      phone: z
        .string()
        .regex(/^\d{10}$/, "Phone number must be a 10 digits")
        .optional(),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
    }),
  }),
});

export const updateRestaurantSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(100),
      status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "PAST_DUE"]),
      address: z.string().max(255).nullable(),
      phone: z.string().max(20).nullable(),
      nit: z.string().max(20).nullable(),
      currency: z.string(),
      timezone: z.string(),
      logoUrl: z.string().url().nullable(),
    })
    .partial(),
});

export const restaurantSearchSchema = z.object({
  query: z.object({
    search: z.string().min(1).max(100).trim().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "PAST_DUE"]).optional(),
  }),
});

export type RestaurantIdParams = z.infer<typeof restaurantIdSchema>["params"];
export type CreateRestaurantInput = z.infer<
  typeof createRestaurantSchema
>["body"];
export type UpdateRestaurantInput = z.infer<
  typeof updateRestaurantSchema
>["body"];
export type RestaurantSearchParams = z.infer<
  typeof restaurantSearchSchema
>["query"];
