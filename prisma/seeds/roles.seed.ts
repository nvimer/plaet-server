import { PrismaClient, RoleName } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const rolesConfig = [
  {
    name: RoleName.SUPERADMIN,
    description: "System superadmin with global access",
    permissions: [
      "user.view",
      "users.create",
      "users.update",
      "users.delete",
      "profiles.view",
      "profiles.update",
      "roles.view",
      "roles.create",
      "roles.update",
      "roles.delete",
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "tables.view",
      "tables.create",
      "tables.update",
      "tables.delete",
    ],
  },
  {
    name: RoleName.ADMIN,
    description: "Admin with complete access to system",
    permissions: [
      "user.view",
      "users.create",
      "users.update",
      "users.delete",
      "profiles.view",
      "profiles.update",
      "roles.view",
      "roles.create",
      "roles.update",
      "roles.delete",
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "tables.view",
      "tables.create",
      "tables.update",
      "tables.delete",
    ],
  },
  {
    name: RoleName.WAITER,
    description: "Waiter - Take orders and manage tables",
    permissions: [
      "users.update",
      "profiles.view",
      "profiles.update",
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "tables.view",
      "tables.update",
      "tables.delete",
    ],
  },
  {
    name: RoleName.CASHIER,
    description: "Cashier, manage pays and close orders",
    permissions: [
      "users.update",
      "profiles.view",
      "profiles.update",
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "tables.view",
      "tables.update",
      "tables.delete",
    ],
  },
  {
    name: RoleName.KITCHEN_MANAGER,
    description: "Admin with complete access to system",
    permissions: [
      "users.update",
      "profiles.view",
      "profiles.update",
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "tables.view",
      "tables.update",
      "tables.delete",
    ],
  },
];

export async function seedRoles() {
  logger.info("🌱 Seeding roles...");

  for (const roleConfig of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { name: roleConfig.name },
      update: { description: roleConfig.description },
      create: {
        name: roleConfig.name,
        description: roleConfig.description,
      },
    });
    logger.info(` 📝 Role "${roleConfig.name}" seeded`);

    for (const permissionName of roleConfig.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
    logger.info(
      `  ✅ ${roleConfig.permissions.length} permissions assigned to ${roleConfig.name}`,
    );
  }
  logger.info(`✅ ${rolesConfig.length} roles seeded successfully!`);
}
