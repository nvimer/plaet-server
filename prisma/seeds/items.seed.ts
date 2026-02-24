import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const itemsByStore = [
  { categoryName: "Sopas SZ", name: "Sopa de Patacón SZ", price: 0 },
  { categoryName: "Sopas SZ", name: "Sancocho de Gallina SZ", price: 0 },
  { categoryName: "Sopas SZ", name: "Crema de Champiñones SZ", price: 0 },
  { categoryName: "Principios SZ", name: "Arroz con Fideos SZ", price: 0 },
  { categoryName: "Principios SZ", name: "Lentejas Guisadas SZ", price: 0 },
  { categoryName: "Principios SZ", name: "Puré de Papa Criolla SZ", price: 0 },
  { categoryName: "Proteínas SZ", name: "Pechuga a la Plancha SZ", price: 6500 },
  { categoryName: "Proteínas SZ", name: "Carne Asada SZ", price: 7500 },
  { categoryName: "Proteínas SZ", name: "Mojarra Frita SZ", price: 9000 },
  { categoryName: "Bebidas SZ", name: "Jugo de Lulo SZ", price: 0 },
  { categoryName: "Bebidas SZ", name: "Agua de Panela SZ", price: 0 },
  { categoryName: "Extras SZ", name: "Porción de Aguacate SZ", price: 1500 },
  { categoryName: "Extras SZ", name: "Huevo Frito SZ", price: 1500 },
  { categoryName: "Ensaladas SZ", name: "Ensalada de Aguacate SZ", price: 0 },
  { categoryName: "Postres SZ", name: "Arroz con Leche SZ", price: 0 },
];

export async function seedItems() {
  logger.info("🌱 Seeding items...");
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: "sazonarte" },
  });
  if (!restaurant) throw new Error("Default restaurant not found");

  for (const item of itemsByStore) {
    const category = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, name: item.categoryName },
    });

    if (category) {
      await prisma.menuItem.upsert({
        where: {
          restaurantId_categoryId_name: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: item.name,
          },
        },
        update: { price: item.price },
        create: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          inventoryType: "UNLIMITED",
        },
      });
    }
  }
  logger.info("✅ Items seeded successfully!");
}
