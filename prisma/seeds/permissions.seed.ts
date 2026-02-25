import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const permissions = [
  { name: "user.view", description: "See all users" },
  { name: "user.create", description: "Create a new user" },
  { name: "user.update", description: "Update user" },
  { name: "user.delete", description: "Delete a user" },

  { name: "profiles.view", description: "View all profiles" },
  { name: "profiles.update", description: "Update a profile" },

  { name: "roles.view", description: "View all roles" },
  { name: "roles.create", description: "Create a new role" },
  { name: "roles.update", description: "Update roles" },
  { name: "roles.delete", description: "Delete roles" },

  { name: "menu.view", description: "View Menu" },
  { name: "menu.create", description: "Create a new menu" },
  { name: "menu.update", description: "Update menu" },
  { name: "menu.delete", description: "Delete a menu" },

  { name: "tables.view", description: "View all tables" },
  { name: "tables.create", description: "Create a new tables" },
  { name: "tables.update", description: "Update tables" },
  { name: "tables.delete", description: "Delete a tables" },

  { name: "restaurants.view", description: "View all restaurants" },
  { name: "restaurants.create", description: "Create a new restaurant" },
  { name: "restaurants.update", description: "Update a restaurant" },
  { name: "restaurants.delete", description: "Delete a restaurant" },
];

export async function seedPermissions() {
  logger.info("🌱 Seeding permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  logger.info(`✅ ${permissions.length} permissions seeded successfully!`);
}
