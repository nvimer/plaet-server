import { Request, Response, NextFunction } from "express";
import { tenantContext } from "../utils/tenant-context";

export const tenantMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const restaurantId = req.user?.restaurantId;

  if (restaurantId) {
    tenantContext.run({ restaurantId }, () => next());
  } else {
    next();
  }
};
