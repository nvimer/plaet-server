import { z } from "zod";

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(3, "First name must be at least 3 characters long")
      .max(50, "First name cannot be exceed 50 characters"),
    lastName: z
      .string()
      .min(3, "Last name must be at least 3 characters long")
      .max(50, "Last name cannot be exceed 50 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Phone number must be a 10 digits")
      .optional(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    roleIds: z.array(
      z
        .number()
        .int()
        .positive("Role ID must be a positive integer")
        .optional(),
    ),
  }),
});

/**
 * User login validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 3 characters long"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];

/**
 * Password reset request validation schema
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

/**
 * Password reset validation schema
 */
export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, "Reset token is required"),
      newPassword: z
        .string()
        .min(12, "Password must be at least 12 characters long")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(
          /[^A-Za-z0-9]/,
          "Password must contain at least one special character",
        )
        .refine((password) => {
          const forbiddenPatterns = ["password", "123456", "qwerty", "admin"];
          const lowerPassword = password.toLowerCase();
          return !forbiddenPatterns.some((pattern) =>
            lowerPassword.includes(pattern),
          );
        }, "Password contains common patterns"),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];

/**
 * Email verification validation schema
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

/**
 * Resend verification email validation schema
 */
export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>["body"];
export type ResendVerificationInput = z.infer<
  typeof resendVerificationSchema
>["body"];

/**
 * Change password validation schema
 * Validates current password and new password with strong policy
 */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(12, "Password must be at least 12 characters long")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(
          /[^A-Za-z0-9]/,
          "Password must contain at least one special character",
        )
        .refine((password) => {
          const forbiddenPatterns = ["password", "123456", "qwerty", "admin"];
          const lowerPassword = password.toLowerCase();
          return !forbiddenPatterns.some((pattern) =>
            lowerPassword.includes(pattern),
          );
        }, "Password contains common patterns"),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }),
});

type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
