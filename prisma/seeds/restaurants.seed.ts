import { PrismaClient, RestaurantStatus } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export async function seedRestaurants() {
  logger.info("🏢 Seeding restaurants...");

  const sazonarte = await prisma.restaurant.upsert({
    where: { slug: "sazonarte" },
    update: {},
    create: {
      name: "Sazonarte",
      slug: "sazonarte",
      status: RestaurantStatus.ACTIVE,
      address: "Calle Principal #123",
      phone: "3000000000",
      nit: "900000000-2",
    },
  });

  const testRestaurant = await prisma.restaurant.upsert({
    where: { slug: "test-restaurant" },
    update: {},
    create: {
      name: "Restaurante de Prueba",
      slug: "test-restaurant",
      status: RestaurantStatus.ACTIVE,
      address: "Carrera 1 #2-3",
      phone: "3110000000",
      nit: "800000000-1",
    },
  });

  logger.info(
    `✅ Restaurants created: ${sazonarte.name} and ${testRestaurant.name}`,
  );
  return { sazonarte, testRestaurant };
}
