import { User, Role, UserRole } from "@prisma/client";
import { UserWithRoles } from "../../user.repository";

/**
 * Base user fixture with default values
 * Override any field by passing an object with the desired values
 */
export function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: "user-fixture-id-001",
    restaurantId: overrides.restaurantId ?? null,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@fixture.test",
    password: "hashedPassword$2b$10$XXXXXXXXXXXX",
    phone: "3001234567",
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    // Auth fields
    emailVerified: true,
    emailVerifiedAt: new Date("2024-01-01T00:00:00.000Z"),
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastFailedLogin: null,
    passwordChangedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates multiple user fixtures with unique identifiers
 */
export function createUserFixtures(
  count: number,
  overrides: Partial<User> = {},
): User[] {
  return Array.from({ length: count }, (_, index) =>
    createUserFixture({
      id: `user-fixture-id-${String(index + 1).padStart(3, "0")}`,
      email: `user${index + 1}@fixture.test`,
      firstName: `User${index + 1}`,
      ...overrides,
    }),
  );
}

/**
 * Creates a soft-deleted user fixture
 */
export function createDeletedUserFixture(overrides: Partial<User> = {}): User {
  return createUserFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Creates an admin user fixture
 */
export function createAdminUserFixture(overrides: Partial<User> = {}): User {
  return createUserFixture({
    id: "admin-fixture-id-001",
    firstName: "Admin",
    lastName: "User",
    email: "admin@fixture.test",
    ...overrides,
  });
}

/**
 * Creates a waiter user fixture
 */
export function createWaiterUserFixture(overrides: Partial<User> = {}): User {
  return createUserFixture({
    id: "waiter-fixture-id-001",
    firstName: "Waiter",
    lastName: "Staff",
    email: "waiter@fixture.test",
    ...overrides,
  });
}

/**
 * Creates a cashier user fixture
 */
export function createCashierUserFixture(overrides: Partial<User> = {}): User {
  return createUserFixture({
    id: "cashier-fixture-id-001",
    firstName: "Cashier",
    lastName: "Staff",
    email: "cashier@fixture.test",
    ...overrides,
  });
}

/**
 * Creates a user fixture without password (for response mocking)
 */
export function createUserWithoutPasswordFixture(
  overrides: Partial<Omit<User, "password">> = {},
): Omit<User, "password"> {
  const { password: _, ...userWithoutPassword } = createUserFixture(overrides);
  return userWithoutPassword;
}

/**
 * Creates a UserWithRoles fixture for testing endpoints that return users with roles
 */
export function createUserWithRolesFixture(
  userOverrides: Partial<User> = {},
  roles: Role[] = [],
): UserWithRoles {
  const user = createUserFixture(userOverrides);
  return {
    ...user,
    roles: roles.map((role) => ({
      roleId: role.id,
      userId: user.id,
      role,
      assignedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
}
