import {
  createOrderFixture,
  createOrderWithItemsFixture,
  createOrderWithRelationsFixture,
} from "../helpers/order.fixtures";
import { OrderStatus, OrderType } from "../../../../types/prisma.types";
import { Prisma } from "@prisma/client";

// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

// Mock Prisma and getPrismaClient
const mockPrismaClient = {
  order: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    create: mockCreate,
    update: mockUpdate,
    count: mockCount,
  },
};

jest.mock("../../../../database/prisma", () => ({
  __esModule: true,
  default: mockPrismaClient,
  getPrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock pagination helper
jest.mock("../../../../utils/pagination.helper", () => ({
  createPaginatedResponse: jest.fn((data, total, params) => ({
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit) || 1,
      hasNextPage: params.page < Math.ceil(total / params.limit),
      hasPreviousPage: params.page > 1,
    },
  })),
}));

import orderRepository from "../../order.repository";

describe("OrderRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated orders", async () => {
      // Arrange
      const mockOrders = [
        createOrderWithItemsFixture(),
        createOrderWithItemsFixture(),
      ];
      mockFindMany.mockResolvedValue(mockOrders);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await orderRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      // Act
      await orderRepository.findAll({ page: 3, limit: 15 });

      // Assert - page 3 with limit 15 = skip 30
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 15,
        }),
      );
    });

    it("should filter by status", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await orderRepository.findAll({
        page: 1,
        limit: 10,
        status: OrderStatus.OPEN,
      });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.OPEN,
          }),
        }),
      );
    });

    it("should filter by type", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await orderRepository.findAll({
        page: 1,
        limit: 10,
        type: OrderType.DINE_IN,
      });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: OrderType.DINE_IN,
          }),
        }),
      );
    });

    it("should order by createdAt descending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await orderRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should include items with menuItem and payments", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await orderRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            items: {
              include: { menuItem: true },
            },
            payments: true,
          },
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return order with all relations", async () => {
      // Arrange
      const mockOrder = createOrderWithRelationsFixture();
      mockFindUnique.mockResolvedValue(mockOrder);

      // Act
      const result = await orderRepository.findById("order-123");

      // Assert
      expect(result).toEqual(mockOrder);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "order-123" },
        include: {
          items: {
            include: { menuItem: true },
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
    });

    it("should return null when order does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await orderRepository.findById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create order with items and include payments", async () => {
      // Arrange
      const waiterId = "waiter-123";
      const restaurantId = "restaurant-123";
      const createData = {
        tableId: 1,
        type: OrderType.DINE_IN,
        items: [
          { menuItemId: 1, quantity: 2, notes: "Sin cebolla", priceAtOrder: 14000 },
          { menuItemId: 2, quantity: 1, priceAtOrder: 10000 },
        ],
      };
      const mockCreatedOrder = createOrderWithItemsFixture();
      mockCreate.mockResolvedValue(mockCreatedOrder);

      // Act
      const result = await orderRepository.create(waiterId, {
        ...createData,
        restaurantId,
      });

      // Assert
      expect(result).toEqual(mockCreatedOrder);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tableId: 1,
          type: OrderType.DINE_IN,
          waiterId: "waiter-123",
          restaurantId: "restaurant-123",
          status: OrderStatus.OPEN,
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({ menuItemId: 1, quantity: 2 }),
              expect.objectContaining({ menuItemId: 2, quantity: 1 }),
            ]),
          },
        }),
        include: {
          items: {
            include: { menuItem: true },
          },
          payments: true,
        },
      });
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      // Arrange
      const mockUpdatedOrder = createOrderFixture({
        status: OrderStatus.SENT_TO_CASHIER,
      });
      mockUpdate.mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await orderRepository.updateStatus(
        "order-123",
        OrderStatus.SENT_TO_CASHIER,
      );

      // Assert
      expect(result.status).toBe(OrderStatus.SENT_TO_CASHIER);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "order-123" },
        data: { status: OrderStatus.SENT_TO_CASHIER },
      });
    });
  });

  describe("cancel", () => {
    it("should cancel order by setting status to CANCELLED", async () => {
      // Arrange
      const mockCancelledOrder = createOrderFixture({
        status: OrderStatus.CANCELLED,
      });
      mockUpdate.mockResolvedValue(mockCancelledOrder);

      // Act
      const result = await orderRepository.cancel("order-123");

      // Assert
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "order-123" },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  });

  describe("updateTotal", () => {
    it("should update order total amount", async () => {
      // Arrange
      const mockUpdatedOrder = {
        ...createOrderFixture(),
        totalAmount: new Prisma.Decimal("45000"),
      };
      mockUpdate.mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await orderRepository.updateTotal("order-123", 45000);

      // Assert
      expect(result.totalAmount.toNumber()).toBe(45000);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "order-123" },
        data: { totalAmount: 45000 },
      });
    });
  });
});
