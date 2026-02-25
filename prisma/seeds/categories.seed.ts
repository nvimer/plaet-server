import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const categoriesData = [
  { name: "Sopas", description: "Sopas del día", order: 1 },
  { name: "Arroces", description: "Opciones de arroz", order: 2 },
  { name: "Principios", description: "Principios del día", order: 3 },
  { name: "Proteínas", description: "Opciones de proteína", order: 4 },
  { name: "Bebidas", description: "Bebidas incluidas", order: 5 },
  { name: "Extras", description: "Acompañamientos extra", order: 6 },
  { name: "Ensaladas", description: "Ensaladas del día", order: 7 },
  { name: "Postres", description: "Postres opcionales", order: 8 },
];

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
