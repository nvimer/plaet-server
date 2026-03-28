import { MenuCategory } from "@prisma/client";

export function createCategoryFixture(
  overrides: Partial<MenuCategory> = {},
): MenuCategory {
  return {
    id: 1,
    restaurantId: (overrides.restaurantId ?? null) as string | null,
    name: "Main Dishes",
    description: "Platos principales del menú",
    order: 1,
    deleted: false,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Creates multiple category fixtures with unique identifiers
 */
export function createCategoryFixtures(
  count: number,
  overrides: Partial<MenuCategory> = {},
): MenuCategory[] {
  return Array.from({ length: count }, (_, index) =>
    createCategoryFixture({
      id: index + 1,
      name: `Category ${index + 1}`,
      order: index + 1,
      ...overrides,
    }),
  );
}

/**
 * Creates a soft-deleted category fixture
 */
export function createDeletedCategoryFixture(
  overrides: Partial<MenuCategory> = {},
): MenuCategory {
  return createCategoryFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Pre-configured fixtures for common test scenarios
 */
export const CATEGORY_FIXTURES = {
  mainDishes: createCategoryFixture({
    id: 1,
    name: "Platos Principales",
    order: 1,
  }),
  beverages: createCategoryFixture({
    id: 2,
    name: "Bebidas",
    order: 2,
  }),
  desserts: createCategoryFixture({
    id: 3,
    name: "Postres",
    order: 3,
  }),
  appetizers: createCategoryFixture({
    id: 4,
    name: "Entradas",
    order: 4,
  }),
  deleted: createDeletedCategoryFixture({
    id: 99,
    name: "Categoría Eliminada",
  }),
};
