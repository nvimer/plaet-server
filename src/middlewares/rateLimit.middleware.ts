import rateLimit from "express-rate-limit";
import { logger } from "../config/logger";
import { Request, Response, NextFunction } from "express";

/**
 * Rate limiting configuration for authentication endpoints
 * Prevents brute force attacks by limiting login attempts
 */

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed requests per windowMs
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Account locked temporarily.",
      errorCode: "RATE_LIMIT_EXCEEDED",
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Rate limiting for token refresh endpoint
 * More lenient because:
 * 1. Natural token expiration is expected behavior
 * 2. Multiple tabs/apps may try to refresh simultaneously
 * 3. Users shouldn't be locked out for normal session expiration
 */
export const refreshTokenRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow 20 requests per 15 minutes (more lenient)
  message: "Too many token refresh attempts. Please wait before trying again.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Refresh token rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many refresh attempts. Please wait before trying again.",
      errorCode: "REFRESH_RATE_LIMIT_EXCEEDED",
      retryAfter: 900, // 15 minutes
    });
  },
});
