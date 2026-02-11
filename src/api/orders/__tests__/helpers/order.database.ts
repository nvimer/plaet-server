import { Order, MenuItem, MenuCategory, Prisma } from "@prisma/client";
import { getTestDatabaseClient } from "../../../../tests/shared/test-database";
import {
  OrderStatus,
  OrderType,
  InventoryType,
} from "../../../../types/prisma.types";

/**
 * Creates a test menu category (required for menu items)
 */
export async function createTestMenuCategory(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<MenuCategory> {
  const db = getTestDatabaseClient();

  return db.menuCategory.create({
    data: {
      name: `Test Category ${Date.now()}`,
      description: "Category for order tests",
      order: 1,
      ...overrides,
    } as Prisma.MenuCategoryCreateInput,
  });
}

/**
 * Creates a test menu item
 */
export async function createTestMenuItem(
  categoryId: number,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<MenuItem> {
  const db = getTestDatabaseClient();

  return db.menuItem.create({
    data: {
      category: { connect: { id: categoryId } },
      name: `Test Item ${Date.now()}`,
      description: "Menu item for order tests",
      price: new Prisma.Decimal("10000"),
      isExtra: false,
      isAvailable: true,
      inventoryType: InventoryType.TRACKED,
      stockQuantity: 50,
      lowStockAlert: 5,
      autoMarkUnavailable: true,
      ...overrides,
    },
  });
}

/**
 * Creates a test order (without items)
 */
export async function createTestOrder(
  waiterId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<Order> {
  const db = getTestDatabaseClient();

  return db.order.create({
    data: {
      waiter: { connect: { id: waiterId } },
      status: OrderStatus.PENDING,
      type: OrderType.DINE_IN,
      totalAmount: new Prisma.Decimal("0"),
      ...overrides,
    },
  });
}

/**
 * Creates a test order with items
 */
export async function createTestOrderWithItems(
  waiterId: string,
  menuItemId: number,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const db = getTestDatabaseClient();

  return db.order.create({
    data: {
      waiter: { connect: { id: waiterId } },
      status: OrderStatus.PENDING,
      type: OrderType.DINE_IN,
      totalAmount: new Prisma.Decimal("25000"),
      items: {
        create: [
          {
            menuItem: { connect: { id: menuItemId } },
            quantity: 2,
            priceAtOrder: new Prisma.Decimal("12500"),
            notes: "Test order item",
          },
        ],
      },
      ...overrides,
    },
    include: {
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });
}

/**
 * Creates a complete test order with all relations
 */
export async function createCompleteTestOrder(
  waiterId: string,
  menuItemId: number,
  tableId?: number,
) {
  const db = getTestDatabaseClient();

  return db.order.create({
    data: {
      waiter: { connect: { id: waiterId } },
      ...(tableId && { table: { connect: { id: tableId } } }),
      status: OrderStatus.PENDING,
      type: tableId ? OrderType.DINE_IN : OrderType.TAKE_OUT,
      totalAmount: new Prisma.Decimal("25000"),
      items: {
        create: [
          {
            menuItem: { connect: { id: menuItemId } },
            quantity: 2,
            priceAtOrder: new Prisma.Decimal("12500"),
          },
        ],
      },
    },
    include: {
      items: {
        include: {
          menuItem: true,
        },
      },
      table: true,
      waiter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Finds a test order by ID with all relations
 */
export async function findTestOrderById(id: string) {
  const db = getTestDatabaseClient();

  return db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: true,
        },
      },
      table: true,
      waiter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      customer: true,
      payments: true,
    },
  });
}

/**
 * Updates a test order's status
 */
export async function updateTestOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const db = getTestDatabaseClient();

  return db.order.update({
    where: { id },
    data: { status },
  });
}

/**
 * Gets all orders for a specific waiter
 */
export async function getTestOrdersByWaiter(waiterId: string) {
  const db = getTestDatabaseClient();

  return db.order.findMany({
    where: { waiterId },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Gets all orders for a specific table
 */
export async function getTestOrdersByTable(tableId: number) {
  const db = getTestDatabaseClient();

  return db.order.findMany({
    where: { tableId },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Counts orders by status
 */
export async function countTestOrdersByStatus(
  status: OrderStatus,
): Promise<number> {
  const db = getTestDatabaseClient();

  return db.order.count({
    where: { status },
  });
}

/**
 * Deletes a specific test order and its items
 */
export async function deleteTestOrder(id: string): Promise<void> {
  const db = getTestDatabaseClient();

  await db.orderItem.deleteMany({ where: { orderId: id } });
  await db.order.delete({ where: { id } });
}

/**
 * Deletes ALL test orders and related data
 */
export async function deleteAllTestOrders(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
}

/**
 * Deletes all test menu items and categories
 */
export async function deleteAllTestMenuItems(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.stockAdjustment.deleteMany();
  await db.orderItem.deleteMany();
  await db.dailyMenuOption.deleteMany();
  await db.menuItem.deleteMany();
  await db.menuCategory.deleteMany();
}

/**
 * Creates a test table
 */
export async function createTestTable(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const db = getTestDatabaseClient();

  return db.table.create({
    data: {
      number: `T${Date.now()}`,
      status: "AVAILABLE",
      location: "Interior",
      ...overrides,
    } as Prisma.TableCreateInput,
  });
}

/**
 * Deletes all test tables
 */
export async function deleteAllTestTables(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.order.deleteMany();
  await db.table.deleteMany();
}
