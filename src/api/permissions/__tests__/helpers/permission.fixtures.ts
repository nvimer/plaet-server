import { Permission } from "@prisma/client";

export function createPermissionFixture(
  overrides: Partial<Permission> = {},
): Permission {
  return {
    id: 1,
    name: "users:read",
    description: "Can read user information",
    isSystem: overrides.isSystem ?? false,
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates multiple permission fixtures with unique identifiers
 */
export function createPermissionFixtures(
  count: number,
  overrides: Partial<Permission> = {},
): Permission[] {
  const permissionNames = [
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:delete",
    "menu:read",
    "menu:create",
  ];
  return Array.from({ length: count }, (_, index) =>
    createPermissionFixture({
      id: index + 1,
      name: permissionNames[index % permissionNames.length],
      description: `Permission for ${permissionNames[index % permissionNames.length]}`,
      ...overrides,
    }),
  );
}

/**
 * Creates a soft-deleted permission fixture
 */
export function createDeletedPermissionFixture(
  overrides: Partial<Permission> = {},
): Permission {
  return createPermissionFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Pre-configured fixtures for common test scenarios
 */
export const PERMISSION_FIXTURES = {
  usersRead: createPermissionFixture({
    id: 1,
    name: "users:read",
    description: "Can view users",
  }),
  usersCreate: createPermissionFixture({
    id: 2,
    name: "users:create",
    description: "Can create users",
  }),
  usersUpdate: createPermissionFixture({
    id: 3,
    name: "users:update",
    description: "Can update users",
  }),
  usersDelete: createPermissionFixture({
    id: 4,
    name: "users:delete",
    description: "Can delete users",
  }),
  ordersRead: createPermissionFixture({
    id: 5,
    name: "orders:read",
    description: "Can view orders",
  }),
  ordersCreate: createPermissionFixture({
    id: 6,
    name: "orders:create",
    description: "Can create orders",
  }),
  menuRead: createPermissionFixture({
    id: 7,
    name: "menu:read",
    description: "Can view menu",
  }),
  menuUpdate: createPermissionFixture({
    id: 8,
    name: "menu:update",
    description: "Can update menu",
  }),
  deleted: createDeletedPermissionFixture({
    id: 99,
    name: "deleted:permission",
  }),
};
