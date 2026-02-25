import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const permissions = [
  // Users
  { name: "users:read", description: "Ver lista de usuarios" },
  { name: "users:create", description: "Crear nuevos usuarios" },
  { name: "users:update", description: "Editar usuarios existentes" },
  { name: "users:delete", description: "Eliminar usuarios" },

  // Roles
  { name: "roles:manage", description: "Gestionar roles y sus permisos" },

  // Restaurants (SuperAdmin)
  {
    name: "restaurants:manage",
    description: "Administrar todos los restaurantes (SaaS)",
  },

  // Menu
  { name: "menu:read", description: "Ver el menú y productos" },
  { name: "menu:manage", description: "Crear y editar categorías y productos" },

  // Stock
  {
    name: "stock:manage",
    description: "Gestionar inventario y ajustes de stock",
  },

  // Tables
  { name: "tables:manage", description: "Configurar y gestionar mesas" },

  // Orders
  { name: "orders:read", description: "Ver lista de pedidos" },
  { name: "orders:create", description: "Tomar nuevos pedidos" },
  { name: "orders:update", description: "Modificar pedidos pendientes" },
  { name: "orders:cancel", description: "Cancelar pedidos" },
  { name: "orders:pay", description: "Procesar pagos de pedidos" },

  // Kitchen
  { name: "kitchen:view", description: "Acceso a la pantalla de cocina" },
  { name: "kitchen:update", description: "Marcar pedidos como listos" },

  // Cash
  { name: "cash:manage", description: "Realizar aperturas y cierres de caja" },

  // Expenses
  { name: "expenses:manage", description: "Registrar y gestionar gastos" },

  // Analytics
  {
    name: "analytics:view",
    description: "Ver reportes y estadísticas de ventas",
  },

  // Settings
  {
    name: "settings:update",
    description: "Actualizar configuración del restaurante",
  },
];

export async function seedPermissions() {
  logger.info("🌱 Seeding granular permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
  }

  logger.info(
    `✅ ${permissions.length} granular permissions seeded successfully!`,
  );
}
