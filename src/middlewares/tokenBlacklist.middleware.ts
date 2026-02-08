import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import tokenService from "../api/auth/tokens/token.service";

/**
 * Token Blacklisting Middleware
 *
 * This middleware checks if the access token is blacklisted
 * before allowing access to protected routes.
 *
 * It should be used AFTER passport.initialize() but BEFORE
 * authJwt middleware or any protected route.
 */
export const tokenBlacklistMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract token string from request
    let tokenString: string | undefined;

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
    // (Passport will handle this later)
    if (!tokenString) {
      next();
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenService.isTokenBlacklisted(tokenString);

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
  } catch (error) {
    logger.error("Error checking token blacklist:", error);
    next();
  }
};
