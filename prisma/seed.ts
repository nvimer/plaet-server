import { PrismaClient } from "@prisma/client";
import { logger } from "../src/config/logger";
import { seedPermissions } from "./seeds/permissions.seed";
import { seedRoles } from "./seeds/roles.seed";
import { seedRestaurants } from "./seeds/restaurants.seed";
import { seedUsers } from "./seeds/users.seed";
import { seedCategories } from "./seeds/categories.seed";
import { seedItems } from "./seeds/items.seed";

const prisma = new PrismaClient();

async function main() {
  logger.info("🚀 Starting database seeding (Infrastructure only)...\n");

  try {
    await seedPermissions();
    logger.info("");

    await seedRoles();
    logger.info("");

    await seedUsers();
    logger.info("");

    await seedCategories();
    logger.info("");

    logger.info("🎉 Database infrastructure seeding completed successfully!");
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
