import { Request, Response, NextFunction } from "express";
import { RoleName } from "@prisma/client";
import userService from "../api/users/user.service";
import { AuthenticatedUser } from "../types/express";

export const roleMiddleware = (allowedRoles: RoleName[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as AuthenticatedUser;

      if (!user || !user.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const authenticatedUser =
        await userService.findUserWithRolesAndPermissions(user.id);

      const hasAllowedRole = authenticatedUser.roles.some((userRole) =>
        allowedRoles.includes(userRole.role.name),
      );

      if (!hasAllowedRole) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
