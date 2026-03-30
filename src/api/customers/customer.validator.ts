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
    .regex(/^[a-zA-Z0-9\s.\-]+$/, "First name contains invalid characters"),

  lastName: z
    .string()
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9\s.\-]+$/, "Last name contains invalid characters")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?\d{10,14}$/, "Invalid phone number format"),

  phone2: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?\d{10,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),

  address1: z.string().max(255).optional().or(z.literal("")),
  address2: z.string().max(255).optional().or(z.literal("")),

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
    .regex(/^[a-zA-Z0-9\s.\-]+$/, "First name contains invalid characters")
    .optional(),

  lastName: z
    .string()
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9\s.\-]+$/, "Last name contains invalid characters")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?\d{10,14}$/, "Invalid phone number format")
    .optional(),

  phone2: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?\d{10,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),

  address1: z.string().max(255).optional().or(z.literal("")),
  address2: z.string().max(255).optional().or(z.literal("")),

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
 * Schema for customer search by query (phone or name)
 */
export const phoneSearchSchema = z.object({
  phone: z.string().min(3, "Search query must be at least 3 characters"),
});

// Type exports for TypeScript
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type SearchCustomersInput = z.infer<typeof searchCustomersSchema>;
export type CustomerIdInput = z.infer<typeof customerIdSchema>;
export type PhoneSearchInput = z.infer<typeof phoneSearchSchema>;
