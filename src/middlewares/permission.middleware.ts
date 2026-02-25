import { Request, Response, NextFunction } from "express";
import { RoleName } from "@prisma/client";
import userService from "../api/users/user.service";
import { CustomError } from "../types/custom-errors";
import { HttpStatus } from "../utils/httpStatus.enum";
import { AuthenticatedUser } from "../types/express";

/**
 * Middleware to check if the authenticated user has a specific permission.
 */
export const permissionMiddleware = (requiredPermission: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user as AuthenticatedUser;

      if (!user || !user.id) {
        throw new CustomError(
          "Unauthorized access",
          HttpStatus.UNAUTHORIZED,
          "UNAUTHORIZED",
        );
      }

      // Special case: users can always access their own roles and permissions
      // This is used by the frontend to build the UI based on permissions
      if (req.params.id === user.id && requiredPermission === "users:read") {
        return next();
      }

      const authenticatedUser =
        await userService.findUserWithRolesAndPermissions(user.id);

      if (!authenticatedUser) {
        throw new CustomError(
          "User not found",
          HttpStatus.NOT_FOUND,
          "USER_NOT_FOUND",
        );
      }

      const isSuperAdmin = authenticatedUser.roles.some(
        (userRole) => userRole.role.name === RoleName.SUPERADMIN,
      );

      if (isSuperAdmin) {
        return next();
      }

      const hasPermission = authenticatedUser.roles.some((userRole) => {
        const role = userRole.role;
        return role.permissions?.some(
          (rp) => rp.permission.name === requiredPermission,
        );
      });

      if (!hasPermission) {
        throw new CustomError(
          `Permission denied: "\${requiredPermission}" required`,
          HttpStatus.FORBIDDEN,
          "FORBIDDEN",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
