import { Router } from "express";
import authController from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import { loginSchema, registerSchema } from "./auth.validator";
import { logoutMiddleware } from "../../middlewares/logout.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();

/**
 * POST /auth/register
 */
router.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  authController.register,
);

/**
 * POST /auth/login
 */
router.post(
  "/login",
  authRateLimit,
  validate(loginSchema),
  authController.login,
);

/**
 * POST /auth/logout
 * Uses logoutMiddleware instead of authJwt to allow logout even with blacklisted tokens
 */
router.post("/logout", logoutMiddleware, authController.logout);

export default router;
