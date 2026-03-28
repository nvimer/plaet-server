import { Table, TableStatus } from "@prisma/client";

/**
 * Base table fixture with default values
 */
export function createTableFixture(overrides: Partial<Table> = {}): Table {
  return {
    id: 1,
    restaurantId: (overrides.restaurantId ?? null) as string | null,
    number: "T1",
    status: TableStatus.AVAILABLE,
    location: null,
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates multiple table fixtures with unique identifiers
 */
export function createTableFixtures(
  count: number,
  overrides: Partial<Table> = {},
): Table[] {
  return Array.from({ length: count }, (_, index) =>
    createTableFixture({
      id: index + 1,
      number: `T${index + 1}`,
      ...overrides,
    }),
  );
}

/**
 * Creates an occupied table fixture
 */
export function createOccupiedTableFixture(
  overrides: Partial<Table> = {},
): Table {
  return createTableFixture({
    status: TableStatus.OCCUPIED,
    ...overrides,
  });
}

/**
 * Creates a table that needs cleaning fixture
 */
export function createNeedsCleaningTableFixture(
  overrides: Partial<Table> = {},
): Table {
  return createTableFixture({
    status: TableStatus.NEEDS_CLEANING,
    ...overrides,
  });
}

/**
 * Creates a soft-deleted table fixture
 */
export function createDeletedTableFixture(
  overrides: Partial<Table> = {},
): Table {
  return createTableFixture({
    deleted: true,
    deletedAt: new Date("2024-06-15T12:00:00.000Z"),
    ...overrides,
  });
}

/**
 * Pre-configured fixtures for common test scenarios
 */
export const TABLE_FIXTURES = {
  available: createTableFixture({
    id: 1,
    number: "T1",
    status: TableStatus.AVAILABLE,
  }),
  occupied: createOccupiedTableFixture({
    id: 2,
    number: "T2",
  }),
  needsCleaning: createNeedsCleaningTableFixture({
    id: 3,
    number: "T3",
  }),
  terrace: createTableFixture({
    id: 4,
    number: "T4",
    location: "Terraza",
  }),
  interior: createTableFixture({
    id: 5,
    number: "T5",
    location: "Interior",
  }),
  deleted: createDeletedTableFixture({
    id: 99,
    number: "T99",
  }),
};
