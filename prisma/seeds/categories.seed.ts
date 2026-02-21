import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export const categoriesConfig = [
  {
    name: "Sopas",
    description: "Sopas del día",
    order: 1,
  },
  {
    name: "Principios",
    description: "Principios (frijoles, lentejas, garbanzos, etc)",
    order: 2,
  },
  {
    name: "Proteínas",
    description: "Carnes, pollo, pescado, cerdo, etc",
    order: 3,
  },
  {
    name: "Arroces",
    description: "Diferentes tipos de arroz",
    order: 4,
  },
  {
    name: "Ensaladas",
    description: "Ensaladas y acompañamientos frescos",
    order: 5,
  },
  {
    name: "Bebidas",
    description: "Bebidas y jugos naturales",
    order: 6,
  },
  {
    name: "Postres",
    description: "Postres y dulces",
    order: 7,
  },
  {
    name: "Extras",
    description: "Adiciones y porciones extra",
    order: 8,
  },
];

export async function seedCategories() {
  logger.info("🌱 Seeding menu categories...");

  for (const category of categoriesConfig) {
    await prisma.menuCategory.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        order: category.order,
      },
      create: {
        name: category.name,
        description: category.description,
        order: category.order,
      },
    });
    logger.info(` 📝 Menu Category "${category.name}" seeded`);
  }

  logger.info(
    `✅ ${categoriesConfig.length} menu categories seeded successfully!`,
  );
}
