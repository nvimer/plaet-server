import { PrismaClient, RoleName, Prisma } from "@prisma/client";
import { logger } from "../../config/logger";

/**
 * Standard roles that every restaurant should have.
 */
export const tenantRolesTemplate = [
  {
    name: RoleName.ADMIN,
    description: "Dueño/Gerente del restaurante con acceso total local",
    permissions: [
      "users:read", "users:create", "users:update", "users:delete",
      "roles:manage", "menu:read", "menu:manage", "stock:manage",
      "tables:manage", "orders:read", "orders:create", "orders:update",
      "orders:cancel", "orders:pay", "kitchen:view", "kitchen:update",
      "cash:manage", "expenses:manage", "analytics:view", "settings:update",
    ],
  },
  {
    name: RoleName.WAITER,
    description: "Mesero - Toma pedidos y gestiona mesas",
    permissions: [
      "menu:read", "tables:manage", "orders:read", "orders:create", "orders:update",
    ],
  },
  {
    name: RoleName.CASHIER,
    description: "Cajero - Gestiona pagos y cierres de caja",
    permissions: [
      "menu:read", "orders:read", "orders:pay", "cash:manage",
      "expenses:manage", "analytics:view",
    ],
  },
  {
    name: RoleName.KITCHEN_MANAGER,
    description: "Cocina - Visualiza y prepara pedidos",
    permissions: ["menu:read", "orders:read", "kitchen:view", "kitchen:update"],
  },
];

/**
 * Seeds standard roles for a specific restaurant.
 * Used during restaurant creation and initial database seeding.
 */
export async function seedRestaurantRoles(tx: any, restaurantId: string) {
  logger.info(`🌱 Seeding standard roles for restaurant ${restaurantId}...`);

  for (const roleConfig of tenantRolesTemplate) {
    // We use upsert to ensure we don't duplicate if called multiple times
    const role = await tx.role.upsert({
      where: { 
        restaurantId_name: { 
          restaurantId, 
          name: roleConfig.name 
        } 
      },
      update: { description: roleConfig.description },
      create: {
        name: roleConfig.name,
        description: roleConfig.description,
        restaurantId,
      },
    });

    for (const permissionName of roleConfig.permissions) {
      const permission = await tx.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await tx.rolePermission.upsert({
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
