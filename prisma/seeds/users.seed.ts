import { PrismaClient, RoleName } from "@prisma/client";
import { logger } from "../../src/config/logger";
import hasherUtils from "../../src/utils/hasher.utils";

const prisma = new PrismaClient();

export const usersData = [
  {
    firstName: "Plaet",
    lastName: "Management",
    email: "plaet.management@gmail.com",
    phone: null,
    password: "PlaetAdmin2026*",
    roles: [RoleName.SUPERADMIN],
    restaurantSlug: null,
    profile: {
      address: "System HQ",
    },
  },
];

export async function seedUsers() {
  logger.info("🌱 Seeding users...");

  for (const userData of usersData) {
    const restaurant = userData.restaurantSlug
      ? await prisma.restaurant.findUnique({
          where: { slug: userData.restaurantSlug },
        })
      : null;

    const hashedPassword = hasherUtils.hash(userData.password);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      create: {
        restaurantId: restaurant?.id || null,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        profile: {
          create: userData.profile,
        },
      },
    });

    for (const roleName of userData.roles) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.userRole.upsert({
          where: { roleId_userId: { roleId: role.id, userId: user.id } },
          update: {},
          create: { roleId: role.id, userId: user.id },
        });
      }
    }
  }
  logger.info("✅ Users seeded successfully!");
}
