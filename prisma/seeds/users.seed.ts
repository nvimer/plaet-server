import { PrismaClient, RoleName } from "@prisma/client";
import { logger } from "../../src/config/logger";
import hasherUtils from "../../src/utils/hasher.utils";

const prisma = new PrismaClient();

export const usersData = [
  {
    firstName: "Super",
    lastName: "Admin",
    email: "superadmin@plaet.com",
    phone: "3220000000",
    password: "superadmin123",
    roles: [RoleName.SUPERADMIN],
    restaurantSlug: null,
    profile: {
      address: "System HQ",
    },
  },
  {
    firstName: "Admin",
    lastName: "Sazonarte",
    email: "admin@sazonarte.com",
    phone: "3111234567",
    password: "admin123",
    roles: [RoleName.ADMIN],
    restaurantSlug: "sazonarte",
    profile: {
      address: "Calle 123 #45-67, Ipiales",
    },
  },
  {
    firstName: "Nicolas",
    lastName: "Pantoja",
    email: "mesero@sazonarte.com",
    phone: "3117890123",
    password: "mesero123",
    roles: [RoleName.WAITER],
    restaurantSlug: "sazonarte",
    profile: {
      address: "Carrera Falsa 2 #09-87, Pasto",
    },
  },
  {
    firstName: "Test",
    lastName: "Admin",
    email: "admin@test.com",
    phone: "3119999999",
    password: "testadmin123",
    roles: [RoleName.ADMIN],
    restaurantSlug: "test-restaurant",
    profile: {
      address: "Test Address 123",
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
      update: {},
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
