import { Router } from "express";
import authController from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
} from "./auth.validator";
import { authJwt } from "../../middlewares/auth.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();

/**
 * POST /auth/register
 * Public route - no authentication required
 */
router.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  authController.register,
);

/**
 * POST /auth/login
 * Public route - no authentication required
 */
router.post(
  "/login",
  authRateLimit,
  validate(loginSchema),
  authController.login,
);

/**
 * POST /auth/logout
 * Protected route - requires valid token
 * Token blacklist middleware will check if token is revoked
 */
router.post("/logout", authJwt, authController.logout);

/**
 * POST /auth/forgot-password
 * Public route - requests password reset
 * Rate limited to prevent abuse
 */
router.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * POST /auth/reset-password
 * Public route - resets password with token
 * Rate limited to prevent brute force
 */
router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

/**
 * POST /auth/verify-email
 * Public route - verifies email with token
 * Rate limited to prevent token brute force
 */
router.post(
  "/verify-email",
  authRateLimit,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

/**
 * POST /auth/resend-verification
 * Public route - resends verification email
 * Rate limited to prevent abuse
 */
router.post(
  "/resend-verification",
  authRateLimit,
  validate(resendVerificationSchema),
  authController.resendVerification,
);

/**
 * POST /auth/refresh-token
 * Public route - refreshes access and refresh tokens
 * Reads refresh token from httpOnly cookie
 * Rate limited to prevent abuse
 */
router.post("/refresh-token", authRateLimit, authController.refreshToken);

/**
 * POST /auth/change-password
 * Protected route - changes user password
 * Requires current password verification
 * All sessions are invalidated after password change
 */
router.post(
  "/change-password",
  authJwt,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
