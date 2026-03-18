import { PrismaClient } from "@prisma/client";
import { logger } from "../src/config/logger";
import { seedPermissions } from "./seeds/permissions.seed";
import { seedRoles } from "./seeds/roles.seed";
import { seedUsers } from "./seeds/users.seed";
import { seedRestaurants } from "./seeds/restaurants.seed";
import { seedCategories } from "./seeds/categories.seed";

const prisma = new PrismaClient();

/**
 * Main seed function for infrastructure and indispensable data.
 * This script prepares the database for a clean start.
 */
async function main() {
  logger.info("🚀 Starting indispensable database seeding...\n");

  try {
    // 1. Core Security & RBAC
    await seedPermissions();
    logger.info("");

    await seedRoles();
    logger.info("");

    // 2. Initial Access & Context
    await seedRestaurants();
    logger.info("");

    await seedUsers();
    logger.info("");

    // 3. Operational Defaults
    // Categories are applied to existing restaurants in seedCategories
    await seedCategories();
    logger.info("");

    logger.info("🎉 Indispensable database seeding completed successfully!");
  } catch (error) {
    logger.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
