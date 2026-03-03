import { MenuItem, Prisma, StockAdjustment } from "@prisma/client";

export type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

// ======== INVENTORY TYPES ===========
/**
 * MenuItem with stock information included
 */
export type MenuItemWithStock = MenuItem & {
  stockAdjustments?: StockAdjustment[];
};

/**
 * Inventory Types
 */
export enum InventoryType {
  TRACKED = "TRACKED", // Stock control
  UNLIMITED = "UNLIMITED", // Without limit
}

/**
 * StockAdjustment Types
 */
export enum StockAdjustmentType {
  DAILY_RESET = "DAILY_RESET", // Begin of the day
  MANUAL_ADD = "MANUAL_ADD", // Admin add stock
  MANUAL_REMOVE = "MANUAL_REMOVE", // Admin rest stock
  ORDER_DEDUCT = "ORDER_DEDUCT", // Order confirmed
  ORDER_CANCELLED = "ORDER_CANCELLED", // Order cancelled
  AUTO_BLOCKED = "AUTO_BLOCKED", // Auto blocked for stock 0
}

// =============================
// ORDER TYPES
// =============================

/**
 * Order with all relations included
 *
 * Includes:
 * - items: Array of OrderItem with MenItem details
 * - table: Table information (optional)
 * - waiter: User who took the Order
 * - customer: Customer information (optional)
 * - pauments: Payment records (optional)
 */
export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        menuItem: true;
      };
    };
    table: true;
    waiter: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    customer: true;
    payments: true;
  };
}>;

/**
 * Order with items only (most common use case)
 *
 * Used for:
 * - Order creation responses
 * - Order list displays
 * - POST/Mobile interfaces
 */
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        menuItem: true;
      };
    };
  };
}>;

/**
 * Order Status Enum (mirrors Prisma enum)
 *
 * Status Flow:
 * PENDING -> SENT_TO_CASHIER -> PAID -> IN_KITCHEN -> READY -> DELIVERED
 * CANCELLED (can happen from any status)
 */
export enum OrderStatus {
  OPEN = "OPEN",
  SENT_TO_CASHIER = "SENT_TO_CASHIER",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum OrderItemStatus {
  PENDING = "PENDING",
  IN_KITCHEN = "IN_KITCHEN",
  READY = "READY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

/**
 * Order Type Enum (mirrors Prisma enum)
 *
 * Types:
 * - DINE_IN: Customer eating in restaurant
 * - TAKE_OUT: Customer picking up food
 * - DELIVERY: Food delivered to customer
 * - WHATSAPP: Order placed via Whatsapp
 */
export enum OrderType {
  DINE_IN = "DINE_IN",
  TAKE_OUT = "TAKE_OUT",
  DELIVERY = "DELIVERY",
  WHATSAPP = "WHATSAPP",
}
