import { Request, Response, NextFunction } from "express";
import { RoleName } from "@prisma/client";
import userService from "../api/users/user.service";
import { CustomError } from "../types/custom-errors";
import { HttpStatus } from "../utils/httpStatus.enum";

/**
 * Middleware to check if the authenticated user has a specific permission.
 * SUPERADMIN role bypasses all permission checks.
 */
export const permissionMiddleware = (requiredPermission: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        throw new CustomError("Unauthorized access", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
      }

      // 1. Fetch user with full role/permission hierarchy
      const authenticatedUser =
        await userService.findUserWithRolesAndPermissions(user.id);

      if (!authenticatedUser) {
        throw new CustomError("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
      }

      // 2. SUPERADMIN bypass
      const isSuperAdmin = authenticatedUser.roles.some(
        (userRole) => userRole.role.name === RoleName.SUPERADMIN
      );

      if (isSuperAdmin) {
        return next();
      }

      // 3. Check for specific permission in all user roles
      const hasPermission = authenticatedUser.roles.some((userRole) => {
        const role = userRole.role;
        return role.permissions?.some(
          (rp) => rp.permission.name === requiredPermission
        );
      });

      if (!hasPermission) {
        throw new CustomError(
          `Permission denied: "\${requiredPermission}" required`,
          HttpStatus.FORBIDDEN,
          "FORBIDDEN"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
