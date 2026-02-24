import { PrismaClient } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

const itemsByStore = [
  { categoryName: "Sopas", name: "Sopa de Lentejas", price: 0 },
  { categoryName: "Sopas", name: "Sopa de Verduras", price: 0 },
  { categoryName: "Sopas", name: "Crema de Pollo", price: 0 },
  { categoryName: "Principios", name: "Arroz Blanco", price: 0 },
  { categoryName: "Principios", name: "Frijoles", price: 0 },
  { categoryName: "Principios", name: "Puré de Papa", price: 0 },
  { categoryName: "Proteínas", name: "Pollo Asado", price: 6000 },
  { categoryName: "Proteínas", name: "Carne a la Plancha", price: 7000 },
  { categoryName: "Proteínas", name: "Pescado Frito", price: 8000 },
  { categoryName: "Bebidas", name: "Jugo de Mora", price: 0 },
  { categoryName: "Bebidas", name: "Limonada", price: 0 },
  { categoryName: "Extras", name: "Tajadas de Plátano", price: 1000 },
  { categoryName: "Extras", name: "Huevo Frito", price: 1500 },
  { categoryName: "Ensaladas", name: "Ensalada Verde", price: 0 },
  { categoryName: "Postres", name: "Gelatina", price: 0 },
];

export async function seedItems() {
  logger.info("🌱 Seeding items...");
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: "plaet-pos" },
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
