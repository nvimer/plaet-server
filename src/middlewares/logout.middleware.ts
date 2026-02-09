import passport from "passport";
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
): void => {
  passport.authenticate(
    "jwt",
    { session: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err: Error | null, user: Express.User | false, _info: any) => {
      // Only check if there's a token, don't verify validity or blacklist
      if (!user && !err) {
        next();
        return;
      }

      if (err) {
        next(err);
        return;
      }

      // Add user to request for logout controller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = user;
      next();
    },
  )(req, res, next);
};
