import { getTestDatabaseClient } from "./test-database";

/**
 * Cleans all test data from the database
 * Deletes in correct order to avoid foreign key constraint violations
 *
 * Order: Children tables first, then parent tables
 */
export async function cleanupAllTestData(): Promise<void> {
  const db = getTestDatabaseClient();

  // Payment and ticket related (most nested)
  await db.ticketBookUsage.deleteMany();
  await db.dailyTicketBookCode.deleteMany();
  await db.ticketBook.deleteMany();
  await db.payment.deleteMany();

  // Order related
  await db.orderItem.deleteMany();
  await db.order.deleteMany();

  // Menu related
  await db.stockAdjustment.deleteMany();
  await db.dailyMenu.deleteMany();
  await db.menuItem.deleteMany();
  await db.menuCategory.deleteMany();

  // Expense related
  await db.expense.deleteMany();

  // User related
  await db.profile.deleteMany();
  await db.userRole.deleteMany();
  await db.token.deleteMany();
  await db.user.deleteMany();

  // Role and permission related
  await db.rolePermission.deleteMany();
  await db.role.deleteMany();
  await db.permission.deleteMany();

  // Other entities
  await db.table.deleteMany();
  await db.customer.deleteMany();
  await db.restaurant.deleteMany();
}

/**
 * Cleans only order-related test data
 * Use when testing order functionality in isolation
 */
export async function cleanupOrders(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
}

/**
 * Cleans only user-related test data
 * Use when testing user functionality in isolation
 */
export async function cleanupUsers(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.profile.deleteMany();
  await db.userRole.deleteMany();
  await db.token.deleteMany();
  await db.order.deleteMany(); // Orders reference users
  await db.user.deleteMany();
}

/**
 * Cleans only menu-related test data
 * Use when testing menu functionality in isolation
 */
export async function cleanupMenuItems(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.stockAdjustment.deleteMany();
  await db.orderItem.deleteMany();
  await db.dailyMenu.deleteMany();
  await db.menuItem.deleteMany();
  await db.menuCategory.deleteMany();
}

/**
 * Cleans only table-related test data
 */
export async function cleanupTables(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.order.deleteMany(); // Orders may reference tables
  await db.table.deleteMany();
}

/**
 * Cleans only customer-related test data
 */
export async function cleanupCustomers(): Promise<void> {
  const db = getTestDatabaseClient();

  await db.ticketBookUsage.deleteMany();
  await db.dailyTicketBookCode.deleteMany();
  await db.ticketBook.deleteMany();
  await db.order.deleteMany(); // Orders may reference customers
  await db.customer.deleteMany();
}
