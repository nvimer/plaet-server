import { Prisma } from "@prisma/client";
import { OrderStatus, OrderType } from "../../../../types/prisma.types";

export function createOrderFixture(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "order-fixture-id-001",
    status: OrderStatus.PENDING,
    type: OrderType.DINE_IN,
    totalAmount: new Prisma.Decimal("25500"),
    notes: null,
    whatsappOrderId: null,
    tableId: 1,
    customerId: null,
    waiterId: "waiter-fixture-id-001",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Creates an order fixture with items included
 */
export function createOrderWithItemsFixture(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const baseOrder = createOrderFixture(overrides);

  return {
    ...baseOrder,
    items: [
      {
        id: 1,
        orderId: baseOrder.id,
        menuItemId: 1,
        quantity: 2,
        priceAtOrder: new Prisma.Decimal("12750"),
        notes: "Sin cebolla",
        isFreeSubstitution: false,
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        updatedAt: new Date("2024-01-01T12:00:00.000Z"),
        menuItem: {
          id: 1,
          name: "Hamburguesa Clásica",
          description: "Hamburguesa con carne, lechuga y tomate",
          price: new Prisma.Decimal("12750"),
          isExtra: false,
          isAvailable: true,
          categoryId: 1,
          inventoryType: "TRACKED",
          stockQuantity: 50,
          lowStockAlert: 5,
          autoMarkUnavailable: true,
        },
      },
    ],
  };
}

/**
 * Creates an order fixture with full relations
 */
export function createOrderWithRelationsFixture(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const orderWithItems = createOrderWithItemsFixture(overrides);

  return {
    ...orderWithItems,
    table: {
      id: 1,
      number: "1",
      status: "AVAILABLE",
      location: "Interior",
    },
    waiter: {
      id: "waiter-fixture-id-001",
      firstName: "Juan",
      lastName: "Mesero",
      email: "waiter@fixture.test",
    },
    customer: null,
    payments: [],
  };
}

/**
 * Creates a valid order creation payload (request body)
 */
export function createOrderPayload(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    tableId: 1,
    type: OrderType.DINE_IN,
    items: [
      {
        menuItemId: 1,
        quantity: 2,
        notes: "Sin cebolla",
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a take-out order payload
 */
export function createTakeOutOrderPayload(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    type: OrderType.TAKE_OUT,
    items: [
      {
        menuItemId: 1,
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a delivery order payload
 */
export function createDeliveryOrderPayload(
  customerId: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    type: OrderType.DELIVERY,
    customerId,
    items: [
      {
        menuItemId: 1,
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

/**
 * Invalid order payloads for validation testing
 */
export const invalidOrderPayloads = {
  emptyItems: {
    tableId: 1,
    type: OrderType.DINE_IN,
    items: [],
  },
  invalidTableId: {
    tableId: "invalid",
    type: OrderType.DINE_IN,
    items: [{ menuItemId: 1, quantity: 1 }],
  },
  invalidType: {
    tableId: 1,
    type: "INVALID_TYPE",
    items: [{ menuItemId: 1, quantity: 1 }],
  },
  negativeQuantity: {
    tableId: 1,
    type: OrderType.DINE_IN,
    items: [{ menuItemId: 1, quantity: -1 }],
  },
  zeroQuantity: {
    tableId: 1,
    type: OrderType.DINE_IN,
    items: [{ menuItemId: 1, quantity: 0 }],
  },
  missingItems: {
    tableId: 1,
    type: OrderType.DINE_IN,
  },
  missingType: {
    tableId: 1,
    items: [{ menuItemId: 1, quantity: 1 }],
  },
  invalidCustomerId: {
    type: OrderType.DELIVERY,
    customerId: "not-a-uuid",
    items: [{ menuItemId: 1, quantity: 1 }],
  },
};

/**
 * Valid status transitions for workflow testing
 */
export const validStatusTransitions = [
  { from: OrderStatus.PENDING, to: OrderStatus.SENT_TO_CASHIER },
  { from: OrderStatus.SENT_TO_CASHIER, to: OrderStatus.PAID },
  { from: OrderStatus.PAID, to: OrderStatus.IN_KITCHEN },
  { from: OrderStatus.IN_KITCHEN, to: OrderStatus.READY },
  { from: OrderStatus.READY, to: OrderStatus.DELIVERED },
  { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED },
  { from: OrderStatus.SENT_TO_CASHIER, to: OrderStatus.CANCELLED },
  { from: OrderStatus.PAID, to: OrderStatus.CANCELLED },
];

/**
 * Invalid status transitions (terminal states)
 */
export const invalidStatusTransitions = [
  { from: OrderStatus.DELIVERED, to: OrderStatus.PENDING },
  { from: OrderStatus.DELIVERED, to: OrderStatus.CANCELLED },
  { from: OrderStatus.CANCELLED, to: OrderStatus.IN_KITCHEN },
  { from: OrderStatus.CANCELLED, to: OrderStatus.PENDING },
];
