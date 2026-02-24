import { Permission, Role } from "@prisma/client";

// configure values for req.user types

export type PermissionWithRelations = {
  permission: Permission;
};

export type RoleWithPermissions = Role & {
  permissions: PermissionWithRelations[];
};

export type AuthenticatedUser = {
  id: string;
  restaurantId?: string | null;
  email: string;
  roles: {
    role: RoleWithPermissions;
  }[];
};

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}
