import { PrismaClient, RoleName } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const rolesConfig = [
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
  {
    name: RoleName.ADMIN,
    description: "Dueño/Gerente del restaurante con acceso total local",
    permissions: [
      "users:read",
      "users:create",
      "users:update",
      "users:delete",
      "roles:manage",
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
  {
    name: RoleName.WAITER,
    description: "Mesero - Toma pedidos y gestiona mesas",
    permissions: [
      "menu:read",
      "tables:manage",
      "orders:read",
      "orders:create",
      "orders:update",
    ],
  },
  {
    name: RoleName.CASHIER,
    description: "Cajero - Gestiona pagos y cierres de caja",
    permissions: [
      "menu:read",
      "orders:read",
      "orders:pay",
      "cash:manage",
      "expenses:manage",
      "analytics:view",
    ],
  },
  {
    name: RoleName.KITCHEN_MANAGER,
    description: "Cocina - Visualiza y prepara pedidos",
    permissions: ["menu:read", "kitchen:view", "kitchen:update"],
  },
];

export async function seedRoles() {
  logger.info("🌱 Seeding roles and assigning granular permissions...");

  for (const roleConfig of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { name: roleConfig.name },
      update: { description: roleConfig.description },
      create: {
        name: roleConfig.name,
        description: roleConfig.description,
      },
    });
    logger.info(` 📝 Role "\${roleConfig.name}" seeded`);

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
      `  ✅ \${roleConfig.permissions.length} granular permissions assigned to \${roleConfig.name}`,
    );
  }
  logger.info(`✅ \${rolesConfig.length} roles seeded successfully!`);
}
