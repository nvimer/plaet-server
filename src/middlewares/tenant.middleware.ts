import { Request, Response, NextFunction } from "express";
import { tenantContext } from "../utils/tenant-context";
import { AuthenticatedUser } from "../types/express";

/**
 * Middleware to extract restaurantId from authenticated user and set it in the context.
 */
export const tenantMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = req.user as AuthenticatedUser;
  const restaurantId = user?.restaurantId;

  if (restaurantId) {
    logger.info(`[TENANT MIDDLEWARE] Setting context for restaurantId: ${restaurantId}`);
    tenantContext.run({ restaurantId }, () => {
      next();
    });
  } else {
    logger.debug(`[TENANT MIDDLEWARE] No restaurantId found for user: ${user?.email}`);
    next();
  }
};
