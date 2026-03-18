import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";
import { DEFAULT_CATEGORIES } from "../../src/api/menus/categories/category.constants";

const prisma = new PrismaClient();

export const categoriesData = DEFAULT_CATEGORIES;

export async function seedCategories() {
  logger.info("🌱 Seeding categories...");
  const restaurants = await prisma.restaurant.findMany();

  for (const restaurant of restaurants) {
    for (const categoryData of categoriesData) {
      await prisma.menuCategory.upsert({
        where: {
          restaurantId_name: {
            restaurantId: restaurant.id,
            name: categoryData.name,
          },
        },
        update: {},
        create: {
          restaurantId: restaurant.id,
          name: categoryData.name,
          description: categoryData.description,
          order: categoryData.order,
        },
      });
    }
  }
  logger.info("✅ Categories seeded successfully for all restaurants!");
}
