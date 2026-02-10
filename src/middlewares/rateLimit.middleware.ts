import rateLimit from "express-rate-limit";
import { logger } from "../config/logger";

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
