import { MenuItem, Prisma } from "@prisma/client";
import { InventoryType } from "../../../../../types/prisma.types";

export function createMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return {
    id: 1,
    categoryId: 1,
    name: "Hamburguesa Clásica",
    description: "Hamburguesa con carne, lechuga y tomate",
    price: new Prisma.Decimal("14000"),
    isExtra: false,
    isAvailable: true,
    imageUrl: null,
    inventoryType: InventoryType.TRACKED,
    stockQuantity: 50,
    initialStock: 100,
    lowStockAlert: 5,
    autoMarkUnavailable: true,
    // SET_LUNCH SPECIFIC FIELDS
    isProtein: false,
    proteinIcon: null,
    isPlateComponent: false,
    componentType: null,
    comboPrice: null,
    isPremium: false,
    deleted: false,
    deletedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates multiple menu item fixtures with unique identifiers
 */
export function createMenuItemFixtures(
  count: number,
  overrides: Partial<MenuItem> = {},
): MenuItem[] {
  return Array.from({ length: count }, (_, index) =>
    createMenuItemFixture({
      id: index + 1,
      name: `Item ${index + 1}`,
      ...overrides,
    }),
  );
}

/**
 * Creates a TRACKED inventory menu item fixture
 */
export function createTrackedMenuItemFixture(
  stockQuantity = 50,
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    inventoryType: InventoryType.TRACKED,
    stockQuantity,
    initialStock: stockQuantity,
    ...overrides,
  });
}

/**
 * Creates an UNLIMITED inventory menu item fixture
 */
export function createUnlimitedMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    inventoryType: InventoryType.UNLIMITED,
    stockQuantity: null,
    initialStock: null,
    ...overrides,
  });
}

/**
 * Creates an out-of-stock menu item fixture
 */
export function createOutOfStockMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    inventoryType: InventoryType.TRACKED,
    stockQuantity: 0,
    isAvailable: false,
    ...overrides,
  });
}

/**
 * Creates an unavailable menu item fixture (not out of stock, just disabled)
 */
export function createUnavailableMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    isAvailable: false,
    stockQuantity: 50,
    ...overrides,
  });
}

/**
 * Creates a low stock menu item fixture (triggers alert)
 */
export function createLowStockMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    inventoryType: InventoryType.TRACKED,
    stockQuantity: 3,
    lowStockAlert: 5,
    ...overrides,
  });
}

/**
 * Creates an extra item fixture (e.g., extra cheese)
 */
export function createExtraMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    id: 100,
    name: "Queso Extra",
    description: "Porción adicional de queso",
    price: new Prisma.Decimal("3000"),
    isExtra: true,
    inventoryType: InventoryType.UNLIMITED,
    stockQuantity: null,
    ...overrides,
  });
}

/**
 * Creates a beverage item fixture (typically unlimited)
 */
export function createBeverageMenuItemFixture(
  overrides: Partial<MenuItem> = {},
): MenuItem {
  return createMenuItemFixture({
    id: 200,
    categoryId: 5,
    name: "Coca-Cola",
    description: "Bebida gaseosa 350ml",
    price: new Prisma.Decimal("3500"),
    inventoryType: InventoryType.UNLIMITED,
    stockQuantity: null,
    initialStock: null,
    ...overrides,
  });
}

export const MENU_ITEM_FIXTURES = {
  tracked: createMenuItemFixture({ inventoryType: InventoryType.TRACKED }),
  unlimited: createUnlimitedMenuItemFixture(),
  outOfStock: createOutOfStockMenuItemFixture(),
  lowStock: createLowStockMenuItemFixture(),
  unavailable: createUnavailableMenuItemFixture(),
  extra: createExtraMenuItemFixture(),
  beverage: createBeverageMenuItemFixture(),
};
