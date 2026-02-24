import { PrismaClient, RestaurantStatus } from "@prisma/client";
import { logger } from "../../src/config/logger";

const prisma = new PrismaClient();

export async function seedRestaurants() {
  logger.info("🏢 Seeding default restaurant...");

  const restaurant = await prisma.restaurant.upsert({
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

  logger.info(
    `✅ Default restaurant created: ${restaurant.name} (${restaurant.id})`,
  );
  return restaurant;
}
