import { PrismaClient, RoleName } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const globalRoles = [
  {
    name: RoleName.SUPERADMIN,
    description: "Administrador global del sistema (SaaS)",
    permissions: [
      "users:read",
      "users:create",
      "users:update",
      "users:delete",
      "roles:manage",
      "restaurants:manage",
      "menu:read",
      "menu:manage",
      "stock:manage",
      "tables:manage",
      "orders:read",
      "orders:create",
      "orders:update",
      "orders:cancel",
      "orders:pay",
      "kitchen:view",
      "kitchen:update",
      "cash:manage",
      "expenses:manage",
      "analytics:view",
      "settings:update",
    ],
  },
];

export async function seedRoles() {
  logger.info("🌱 Seeding global roles...");

  for (const roleConfig of globalRoles) {
    // Note: Since restaurantId is nullable, we search where it's null
    // Depending on Prisma version/adapter, null handling in compound unique might vary.
    // Here we use findFirst and create if not exists to be safe against null typing issues in upsert where.
    let role = await prisma.role.findFirst({
      where: {
        name: roleConfig.name,
        restaurantId: null
      }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleConfig.name,
          description: roleConfig.description,
          restaurantId: null,
        }
      });
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: { description: roleConfig.description }
      });
    }

    logger.info(` 📝 Global Role ${roleConfig.name} seeded`);

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
  }
}
