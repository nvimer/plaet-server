import { Role, RoleName, Permission } from "@prisma/client";

/**
 * Base role fixture with default values
 */
export function createRoleFixture(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    restaurantId: (overrides.restaurantId ?? null) as string | null,
    name: RoleName.ADMIN,
    description: "Administrator role with full permissions",
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates multiple role fixtures with unique identifiers
 */
export function createRoleFixtures(
  count: number,
  overrides: Partial<Role> = {},
): Role[] {
  const roleNames = [
    RoleName.ADMIN,
    RoleName.WAITER,
    RoleName.CASHIER,
    RoleName.KITCHEN_MANAGER,
  ];
  return Array.from({ length: count }, (_, index) =>
    createRoleFixture({
      id: index + 1,
      name: roleNames[index % roleNames.length],
      ...overrides,
    }),
  );
}

/**
 * Creates a soft-deleted role fixture
 */
export function createDeletedRoleFixture(overrides: Partial<Role> = {}): Role {
  return createRoleFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Creates a role with permissions fixture
 */
export function createRoleWithPermissionsFixture(
  roleOverrides: Partial<Role> = {},
  permissions: Partial<Permission>[] = [],
) {
  return {
    ...createRoleFixture(roleOverrides),
    permissions: permissions.map((p, index) => ({
      permission: {
        id: p.id ?? index + 1,
        name: p.name ?? `permission:${index + 1}`,
        description: p.description ?? `Permission ${index + 1}`,
        deleted: false,
        deletedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    })),
  };
}

/**
 * Pre-configured fixtures for common test scenarios
 */
export const ROLE_FIXTURES = {
  admin: createRoleFixture({
    id: 1,
    name: RoleName.ADMIN,
    description: "Full system access",
  }),
  waiter: createRoleFixture({
    id: 2,
    name: RoleName.WAITER,
    description: "Order management access",
  }),
  cashier: createRoleFixture({
    id: 3,
    name: RoleName.CASHIER,
    description: "Payment processing access",
  }),
  kitchenManager: createRoleFixture({
    id: 4,
    name: RoleName.KITCHEN_MANAGER,
    description: "Kitchen order display access",
  }),
  deleted: createDeletedRoleFixture({
    id: 99,
    name: RoleName.WAITER,
  }),
};
