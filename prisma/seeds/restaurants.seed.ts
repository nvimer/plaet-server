import { PrismaClient, RestaurantStatus } from "@prisma/client";
import { logger } from "../../src/config/logger";
import { seedRestaurantRoles } from "../../src/api/roles/role-seeder.service";

const prisma = new PrismaClient();

export async function seedRestaurants() {
  logger.info("🏢 Seeding initial restaurant...");

  const mainRestaurant = await prisma.restaurant.upsert({
    where: { slug: "plaet-main" },
    update: {},
    create: {
      name: "Restaurante Principal",
      slug: "plaet-main",
      status: RestaurantStatus.ACTIVE,
      address: "Configuración Inicial",
      phone: "0000000000",
      nit: "000000000-0",
    },
  });

  // Seed roles for this restaurant
  await seedRestaurantRoles(prisma, mainRestaurant.id);

  logger.info(
    `✅ Initial restaurant created: ${mainRestaurant.name}`,
  );
  return { mainRestaurant };
}
