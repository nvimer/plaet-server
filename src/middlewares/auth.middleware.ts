import passport from "passport";
import { HttpStatus } from "../utils/httpStatus.enum";
import { NextFunction, Request, Response } from "express";
import { AuthenticatedUser } from "../types/express";
import { CustomError } from "../types/custom-errors";
import tokenService from "../api/auth/tokens/token.service";

// Interface for info if generate error with token
export interface PassportAuthInfo {
  message?: string;
}

// Helper function to extract token from request
const extractTokenFromRequest = (req: Request): string | undefined => {
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // If not in header, try cookies
  return req.cookies?.accessToken || req.cookies?.refreshToken;
};

// Middleware of WJT authentication
export const authJwt = (req: Request, res: Response, next: NextFunction) => {
  // Passport jwt try authenticated petition using "jwt" strategy
  // session in false because we not use sessions based in cookies
  passport.authenticate(
    "jwt",
    { session: false },
    async (
      err: Error | null,
      user: AuthenticatedUser | false,
      info: PassportAuthInfo | undefined,
    ) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(
          new CustomError(
            info?.message || "Unauthorized. Please login and retry",
            HttpStatus.UNAUTHORIZED,
            "UNAUTHORIZED_ACCESS",
          ),
        );
      }

      // Check if token is blacklisted
      const tokenString = extractTokenFromRequest(req);
      if (tokenString) {
        const isBlacklisted =
          await tokenService.isTokenBlacklisted(tokenString);
        if (isBlacklisted) {
          return next(
            new CustomError(
              "Token has been revoked. Please login again.",
              HttpStatus.UNAUTHORIZED,
              "TOKEN_REVOKED",
            ),
          );
        }
      }

      // if authentication is ok, add user to req.user
      req.user = user;
      // pass to next Middleware
      next();
    },
  )(req, res, next);
};
