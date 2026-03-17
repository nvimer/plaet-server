import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const categoriesData = [
  {
    name: "Sopas",
    description:
      "Sopas y caldos tradicionales elaborados diariamente con ingredientes frescos y el sabor de casa.",
    order: 1,
  },
  {
    name: "Arroces",
    description:
      "Nuestra base infaltable: opciones de arroz siempre suelto y con el punto exacto de sazón.",
    order: 2,
  },
  {
    name: "Principios",
    description:
      "La esencia del menú: acompañamientos caseros calientes como frijoles, lentejas, garbanzos, pastas o verduras guisadas.",
    order: 3,
  },
  {
    name: "Proteínas",
    description:
      "Variedad de carnes, pollo o pescado con preparaciones clásicas: a la plancha, en salsa, sudadas o fritas.",
    order: 4,
  },
  {
    name: "Bebidas",
    description:
      "Opciones refrescantes para acompañar tu almuerzo, incluyendo jugos naturales del día y limonadas.",
    order: 5,
  },
  {
    name: "Extras",
    description:
      "Porciones adicionales para complementar tu plato a tu gusto, como aguacate, tajadas de plátano maduro o huevo frito.",
    order: 6,
  },
  {
    name: "Ensaladas",
    description:
      "Acompañamientos frescos y ligeros, preparados con vegetales de temporada y aderezos caseros.",
    order: 7,
  },
  {
    name: "Postres",
    description:
      "El toque dulce tradicional para cerrar el almuerzo, con opciones típicas y porciones justas.",
    order: 8,
  },
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
