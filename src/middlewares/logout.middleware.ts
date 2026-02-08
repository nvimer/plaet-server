import passport from "passport";
import { logger } from "../config/logger";
import { Request, Response, NextFunction } from "express";

/**
 * Logout Middleware
 *
 * This middleware allows logout even if token is blacklisted.
 * It only checks if a token exists (to identify user)
 * without verifying if it's valid or blacklisted.
 */
export const logoutMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: Error | null, user: Express.User | false, info: any) => {
      // Only check if there's a token, don't verify validity or blacklist
      if (!user && !err) {
        return next();
      }

      if (err) {
        return next(err);
      }

      // Add user to request for logout controller
      (req as any).user = user;
      next();
    },
  )(req, res, next);
};
