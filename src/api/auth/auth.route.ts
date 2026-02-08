import { Router } from "express";
import authController from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import { loginSchema, registerSchema } from "./auth.validator";
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

export default router;
