import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const categoriesData = [
  { name: "Sopas", description: "Sopas del día", order: 1 },
  { name: "Principios", description: "Principios del día", order: 2 },
  { name: "Proteínas", description: "Opciones de proteína", order: 3 },
  { name: "Bebidas", description: "Bebidas incluidas", order: 4 },
  { name: "Extras", description: "Acompañamientos extra", order: 5 },
  { name: "Ensaladas", description: "Ensaladas del día", order: 6 },
  { name: "Postres", description: "Postres opcionales", order: 7 },
];

export async function seedCategories() {
  logger.info("🌱 Seeding categories...");
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: "plaet-pos" },
  });
  if (!restaurant) throw new Error("Default restaurant not found");

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
  logger.info("✅ Categories seeded successfully!");
}
