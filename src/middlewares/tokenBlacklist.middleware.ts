import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import tokenService from "../api/auth/tokens/token.service";

/**
 * Routes that don't require token validation (public routes)
 */
const PUBLIC_AUTH_ROUTES = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

/**
 * Token Blacklisting Middleware
 *
 * This middleware checks if a token is blacklisted
 * before allowing access to protected routes.
 *
 * Security Notes:
 * - Only exempts login/register routes (NOT logout)
 * - Logout is protected and requires valid token
 * - All other routes require non-blacklisted token
 */
export const tokenBlacklistMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Skip token check for public authentication routes only
  // IMPORTANT: Logout is NOT exempt - requires valid token
  if (PUBLIC_AUTH_ROUTES.includes(req.path)) {
    next();
    return;
  }

  // Extract token string from request
  let tokenString: string | undefined = undefined;

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    tokenString = authHeader.substring(7);
  }

  // If not in header, try cookies
  if (!tokenString) {
    tokenString = req.cookies?.accessToken || req.cookies?.refreshToken;
  }

  // If no token found, skip blacklisting check
  if (!tokenString) {
    next();
    return;
  }

  // Check if token is blacklisted (this is the only async operation)
  tokenService
    .isTokenBlacklisted(tokenString)
    .then((isBlacklisted) => {
      if (isBlacklisted) {
        logger.warn(`Blacklisted token used by IP: ${req.ip}`);
        res.status(401).json({
          success: false,
          message: "Token has been revoked. Please login again.",
          errorCode: "TOKEN_REVOKED",
        });
        return;
      }

      // Token is not blacklisted, proceed
      next();
    })
    .catch((error) => {
      logger.error("Error checking token blacklist:", error);
      next();
    });
};
