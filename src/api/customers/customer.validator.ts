import { z } from "zod";

/**
 * Schema for customer creation validation
 * Ensures data integrity and business rules
 */
export const createCustomerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),

  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
});

/**
 * Schema for customer update validation
 * Allows partial updates with flexible validation
 */
export const updateCustomerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces")
    .optional(),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces")
    .optional(),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
    .optional(),

  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
});

/**
 * Schema for customer search parameters
 */
export const searchCustomersSchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["firstName", "lastName", "createdAt"]).default("firstName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Schema for customer ID validation
 */
export const customerIdSchema = z.object({
  id: z.string().uuid("Invalid customer ID format"),
});

/**
 * Schema for phone number validation (for search by phone)
 */
export const phoneSearchSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

// Type exports for TypeScript
type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
type SearchCustomersInput = z.infer<typeof searchCustomersSchema>;
type CustomerIdInput = z.infer<typeof customerIdSchema>;
type PhoneSearchInput = z.infer<typeof phoneSearchSchema>;
