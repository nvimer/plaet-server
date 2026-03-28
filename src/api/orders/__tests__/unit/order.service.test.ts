// Mock Prisma client and getPrismaClient BEFORE imports
const mockPrismaClient = {
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  dailyMenu: {
    findUnique: jest.fn(),
  },
  cashClosure: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock("../../../../database/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: mockPrismaClient.$transaction,
  },
  getPrismaClient: jest.fn(() => mockPrismaClient),
  getBasePrismaClient: jest.fn(() => mockPrismaClient),
}));

import { Prisma } from "@prisma/client";
import { OrderStatus, OrderType } from "../../../../types/prisma.types";
import { OrderRepositoryInterface } from "../../interfaces/order.repository.interface";
import { OrderService } from "../../order.service";
import { ItemServiceInterface } from "../../../menus/items/interfaces/item.service.interface";
import { createMockOrderRepository, createMockItemService } from "../helpers";
import {
  createOrderFixture,
  createOrderWithItemsFixture,
  createOrderWithRelationsFixture,
} from "../helpers/order.fixtures";
import { createMenuItemFixture } from "../../../menus/items/__tests__/helpers";

// Mock CashClosureRepository
jest.mock("../../../cash-closures/cash-closure.repository", () => ({
  CashClosureRepository: jest.fn().mockImplementation(() => ({
    findCurrentOpen: jest.fn().mockResolvedValue({ id: "closure-123" }),
    findActiveOnDate: jest.fn().mockResolvedValue({ id: "closure-123" }),
  })),
}));

describe("OrderService - Basic Tests", () => {
  let orderService: OrderService; // ✅ Instancia REAL del servicio
  let mockOrderRepository: jest.Mocked<OrderRepositoryInterface>;
  let mockItemService: {
    findMenuItemById: jest.Mock;
    deductStockForOrder: jest.Mock;
    revertStockForOrder: jest.Mock;
  };

  beforeEach(() => {
    mockOrderRepository = createMockOrderRepository();
    mockItemService = createMockItemService();

    orderService = new OrderService(mockOrderRepository, mockItemService);

    // Reset Prisma client mocks
    mockPrismaClient.order.findUnique.mockReset();
    mockPrismaClient.order.findMany.mockReset();
    mockPrismaClient.order.update.mockReset();
    mockPrismaClient.order.count.mockReset();

    // Setup transaction mock
    mockPrismaClient.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        order: {
          create: jest.fn(),
          update: jest.fn(),
          findUnique: jest.fn(),
        },
      };
      return await callback(mockTx);
    });

    jest.clearAllMocks();
  });

  describe("basic functionality", () => {
    test("should be defined", () => {
      expect(orderService).toBeDefined();
      expect(orderService).toBeInstanceOf(OrderService);
    });
  });

  describe("createOrder method", () => {
    test("should create order with valid items and deduct stock", async () => {
      // Arrange
      const waiterId = "waiter-123";
      const orderData = {
        tableId: 1,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: 1, quantity: 2 }],
      };

      const mockMenuItem = createMenuItemFixture({
        id: 1,
        isAvailable: true,
        stockQuantity: 50,
        inventoryType: "TRACKED",
        price: new Prisma.Decimal("14000"),
      });

      const createdOrder = createOrderFixture({
        id: "order-123",
        waiterId,
        tableId: 1,
        type: OrderType.DINE_IN,
        status: OrderStatus.OPEN,
        totalAmount: new Prisma.Decimal("0"),
      });

      const orderWithItems = createOrderWithItemsFixture({
        id: "order-123",
        waiterId,
        tableId: 1,
        type: OrderType.DINE_IN,
        status: OrderStatus.OPEN,
        totalAmount: new Prisma.Decimal("28000"),
      });
      // Correct the items to have the same price as the menuItem
      orderWithItems.items[0].priceAtOrder = new Prisma.Decimal("14000");

      mockItemService.findMenuItemById.mockResolvedValue(mockMenuItem);
      mockItemService.deductStockForOrder.mockResolvedValue(undefined);
      mockPrismaClient.dailyMenu.findUnique.mockResolvedValue({ id: 1 }); // Mock daily menu

      // Mock the transaction to return the order with items
      const mockTx = {
        order: {
          create: jest.fn().mockResolvedValue(orderWithItems),
          findUnique: jest.fn().mockResolvedValue(orderWithItems),
          update: jest.fn(),
        },
        orderItem: {
          findMany: jest.fn().mockResolvedValue(orderWithItems.items),
          create: jest.fn().mockResolvedValue({}),
        },
        table: {
          update: jest.fn().mockResolvedValue({}),
        },
        customer: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({ id: "customer-123" }),
        },
        payment: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      // Mock repository methods used within transaction
      mockOrderRepository.create.mockResolvedValue(orderWithItems as any);
      mockOrderRepository.updateTotal.mockResolvedValue(undefined as any);

      // Act
      const restaurantId = "restaurant-123";
      const result = await orderService.createOrder(waiterId, restaurantId, orderData);

      // Assert
      expect(mockItemService.findMenuItemById).toHaveBeenCalledWith(1);
      expect(mockItemService.deductStockForOrder).toHaveBeenCalledWith(
        1,
        2,
        "order-123",
        expect.anything(), // tx parameter
      );
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        waiterId,
        expect.objectContaining({
          tableId: 1,
          type: OrderType.DINE_IN,
          restaurantId: restaurantId,
          items: expect.arrayContaining([
            expect.objectContaining({
              menuItemId: 1,
              quantity: 2,
              priceAtOrder: 14000,
            }),
          ]),
        }),
        expect.anything(), // tx parameter
      );
      expect(mockOrderRepository.updateTotal).toHaveBeenCalledWith(
        "order-123",
        28000,
        expect.anything(), // tx parameter
      );
      expect(mockTx.order.findUnique).toHaveBeenCalledWith({
        where: { id: "order-123" },
        include: expect.any(Object),
      });
      expect(result).toEqual(orderWithItems);
    });
  });

  describe("findOrderById method", () => {
    test("should return order when found", async () => {
      // Arrange
      const orderId = "order-123";
      const expectedOrder = createOrderWithRelationsFixture({
        id: orderId,
        status: OrderStatus.OPEN,
        waiterId: "waiter-123",
      });
      mockPrismaClient.order.findUnique.mockResolvedValue(expectedOrder);

      // Act
      const result = await orderService.findOrderById(orderId);

      // Assert
      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
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
      expect(result).toEqual(expectedOrder);
    });

    test("should throw error when order not found", async () => {
      // Arrange
      const orderId = "non-existent";
      mockPrismaClient.order.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(orderService.findOrderById(orderId)).rejects.toThrow(
        "Order with ID non-existent not found",
      );
      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: expect.any(Object),
      });
    });
  });

  describe("updateOrderStatus method", () => {
    test("should update order status when order exists", async () => {
      // Arrange
      const orderId = "order-123";
      const status = OrderStatus.SENT_TO_CASHIER;
      const existingOrder = createOrderWithRelationsFixture({
        id: orderId,
        status: OrderStatus.OPEN,
        waiterId: "waiter-123",
      });
      const updatedOrder = createOrderFixture({
        id: orderId,
        status,
        waiterId: "waiter-123",
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaClient.order.update.mockResolvedValue(updatedOrder);

      // Act
      const result = await orderService.updateOrderStatus(orderId, {
        status,
      });

      // Assert
      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: expect.any(Object),
      });
      expect(mockPrismaClient.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status },
      });
      expect(result).toEqual(updatedOrder);
    });

    test("should throw error when trying to update delivered order", async () => {
      // Arrange
      const orderId = "order-123";
      const deliveredOrder = createOrderWithRelationsFixture({
        id: orderId,
        status: OrderStatus.PAID,
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(deliveredOrder);

      // Act & Assert
      await expect(
        orderService.updateOrderStatus(orderId, {
          status: OrderStatus.OPEN,
        }),
      ).rejects.toThrow("Cannot change status of paid order");
      expect(mockPrismaClient.order.update).not.toHaveBeenCalled();
    });

    test("should throw error when trying to update cancelled order", async () => {
      // Arrange
      const orderId = "order-123";
      const cancelledOrder = createOrderWithRelationsFixture({
        id: orderId,
        status: OrderStatus.CANCELLED,
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(cancelledOrder);

      // Act & Assert
      await expect(
        orderService.updateOrderStatus(orderId, {
          status: OrderStatus.OPEN,
        }),
      ).rejects.toThrow("Cannot change status of cancelled order");
      expect(mockPrismaClient.order.update).not.toHaveBeenCalled();
    });
  });

  describe("cancelOrder method", () => {
    test("should cancel order when order exists and revert stock", async () => {
      // Arrange
      const orderId = "order-123";
      const existingOrder = createOrderWithItemsFixture({
        id: orderId,
        status: OrderStatus.OPEN,
        waiterId: "waiter-123",
      });
      const cancelledOrder = createOrderFixture({
        id: orderId,
        status: OrderStatus.CANCELLED,
        waiterId: "waiter-123",
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(existingOrder);
      mockItemService.revertStockForOrder.mockResolvedValue(undefined);

      // Mock the transaction to return the cancelled order
      // Create a mockTx that will be used in the transaction callback
      const mockTx = {
        order: {
          update: jest.fn().mockResolvedValue(cancelledOrder),
        },
      };

      // Override the beforeEach mock for this specific test
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      // Act
      const result = await orderService.cancelOrder(orderId);

      // Assert
      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: expect.any(Object),
      });
      expect(mockItemService.revertStockForOrder).toHaveBeenCalledWith(
        1, // menuItemId
        2, // quantity
        orderId,
        mockTx, // tx parameter should be the mockTx we created
      );
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(result).toEqual(cancelledOrder);
    });

    test("should throw error when trying to cancel delivered order", async () => {
      // Arrange
      const orderId = "order-123";
      const deliveredOrder = createOrderWithItemsFixture({
        id: orderId,
        status: OrderStatus.PAID,
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(deliveredOrder);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId)).rejects.toThrow(
        "Cannot cancel paid order",
      );
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    test("should throw error when trying to cancel already cancelled order", async () => {
      // Arrange
      const orderId = "order-123";
      const cancelledOrder = createOrderWithItemsFixture({
        id: orderId,
        status: OrderStatus.CANCELLED,
      });

      mockPrismaClient.order.findUnique.mockResolvedValue(cancelledOrder);

      // Act & Assert
      await expect(orderService.cancelOrder(orderId)).rejects.toThrow(
        "Cannot cancel cancelled order",
      );
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("findAllOrders method", () => {
    test("should return paginated orders from repository", async () => {
      // Arrange
      const params = { page: 1, limit: 10 };
      const expectedResponse = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockPrismaClient.order.findMany.mockResolvedValue([]);
      mockPrismaClient.order.count.mockResolvedValue(0);

      // Act
      const result = await orderService.findAllOrders(params);

      // Assert
      expect(mockPrismaClient.order.findMany).toHaveBeenCalled();
      expect(mockPrismaClient.order.count).toHaveBeenCalled();
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    test("should return empty list when no orders exist", async () => {
      // Arrange
      const params = { page: 1, limit: 10 };
      mockPrismaClient.order.findMany.mockResolvedValue([]);
      mockPrismaClient.order.count.mockResolvedValue(0);

      // Act
      const result = await orderService.findAllOrders(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
