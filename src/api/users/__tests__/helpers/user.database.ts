import { User } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { getTestDatabaseClient } from "../../../../tests/shared/test-database";

/**
 * Creates a real user in the test database
 * Uses faker for realistic random data
 */
export async function createTestUser(
  overrides: Partial<User> = {},
): Promise<User> {
  const db = getTestDatabaseClient();

  return db.user.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }),
      phone: faker.phone.number(),
      deleted: false,
      deletedAt: null,
      restaurantId: (overrides.restaurantId ?? null) as string | null,
      ...overrides,
    },
  });
}

/**
 * Creates multiple users in the test database
 */
export async function createTestUsers(
  count: number,
  overrides: Partial<User> = {},
): Promise<User[]> {
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `testuser${i + 1}_${Date.now()}@test.com`,
      ...overrides,
    });
    users.push(user);
  }

  return users;
}

/**
 * Creates a user with a specific email
 */
export async function createTestUserWithEmail(
  email: string,
  overrides: Partial<User> = {},
): Promise<User> {
  return createTestUser({ email, ...overrides });
}

/**
 * Creates a user with a specific ID
 */
export async function createTestUserWithId(
  id: string,
  overrides: Partial<User> = {},
): Promise<User> {
  return createTestUser({ id, ...overrides });
}

/**
 * Creates a user with assigned roles
 */
export async function createTestUserWithRole(
  roleId: number,
  overrides: Partial<User> = {},
): Promise<User> {
  const db = getTestDatabaseClient();
  const user = await createTestUser(overrides);

  await db.userRole.create({
    data: {
      userId: user.id,
      roleId,
    },
  });

  return user;
}

/**
 * Creates a user with a profile
 */
export async function createTestUserWithProfile(
  overrides: Partial<User> = {},
): Promise<User> {
  const db = getTestDatabaseClient();

  return db.user.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }),
      phone: faker.phone.number(),
      restaurantId: (overrides.restaurantId ?? null) as string | null,
      ...overrides,
      profile: {
        create: {
          photoUrl: faker.internet.url(),
          address: faker.location.streetAddress(),
          identification: faker.string.alphanumeric(10),
        },
      },
    },
    include: {
      profile: true,
    },
  });
}

/**
 * Creates a soft-deleted user
 */
export async function createDeletedTestUser(
  overrides: Partial<User> = {},
): Promise<User> {
  return createTestUser({
    deleted: true,
    deletedAt: new Date(),
    ...overrides,
  });
}

/**
 * Finds a user by email in test database
 */
export async function findTestUserByEmail(email: string): Promise<User | null> {
  const db = getTestDatabaseClient();
  return db.user.findUnique({ where: { email } });
}

/**
 * Finds a user by ID in test database
 */
export async function findTestUserById(id: string): Promise<User | null> {
  const db = getTestDatabaseClient();
  return db.user.findUnique({ where: { id } });
}

/**
 * Gets a user with roles and permissions
 */
export async function getTestUserWithRolesAndPermissions(id: string) {
  const db = getTestDatabaseClient();

  return db.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Updates a test user
 */
export async function updateTestUser(
  id: string,
  data: Partial<User>,
): Promise<User> {
  const db = getTestDatabaseClient();

  return db.user.update({
    where: { id },
    data,
  });
}

/**
 * Soft deletes a test user
 */
export async function softDeleteTestUser(id: string): Promise<User> {
  const db = getTestDatabaseClient();

  return db.user.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  });
}

/**
 * Hard deletes a specific test user and related data
 */
export async function deleteTestUser(id: string): Promise<void> {
  const db = getTestDatabaseClient();

  // Delete related data first (foreign key constraints)
  await db.profile.deleteMany({ where: { userId: id } });
  await db.userRole.deleteMany({ where: { userId: id } });
  await db.token.deleteMany({ where: { userId: id } });
  await db.order.deleteMany({ where: { waiterId: id } });

  // Delete user
  await db.user.delete({ where: { id } });
}

/**
 * Deletes ALL test users and related data
 * Use in afterAll or global teardown
 */
export async function deleteAllTestUsers(): Promise<void> {
  const db = getTestDatabaseClient();

  // Delete in correct order for foreign key constraints
  await db.profile.deleteMany();
  await db.userRole.deleteMany();
  await db.token.deleteMany();
  await db.user.deleteMany();
}

/**
 * Counts users in test database
 */
export async function countTestUsers(includeDeleted = false): Promise<number> {
  const db = getTestDatabaseClient();

  return db.user.count({
    where: includeDeleted ? {} : { deleted: false },
  });
}
