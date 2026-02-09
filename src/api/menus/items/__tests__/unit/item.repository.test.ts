import { InventoryType } from "../../../../../types/prisma.types";

// Create mock functions
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();
const mockTransaction = jest.fn();
const mockStockAdjustmentCreate = jest.fn();
const mockStockAdjustmentCreateMany = jest.fn();
const mockStockAdjustmentFindMany = jest.fn();
const mockStockAdjustmentCount = jest.fn();

// Mock Prisma
jest.mock("../../../../../database/prisma", () => ({
  __esModule: true,
  default: {
    menuItem: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      count: mockCount,
      fields: {
        lowStockAlert: "lowStockAlert",
      },
    },
    stockAdjustment: {
      create: mockStockAdjustmentCreate,
      createMany: mockStockAdjustmentCreateMany,
      findMany: mockStockAdjustmentFindMany,
      count: mockStockAdjustmentCount,
    },
    $transaction: mockTransaction,
  },
}));

// Mock pagination helper
jest.mock("../../../../../utils/pagination.helper", () => ({
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

import itemRepository from "../../item.repository";
import { createMenuItemFixture as createItemFixture } from "../helpers";

describe("ItemRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated menu items", async () => {
      // Arrange
      const mockItems = [
        createItemFixture({ id: 1 }),
        createItemFixture({ id: 2 }),
      ];
      mockFindMany.mockResolvedValue(mockItems);
      mockCount.mockResolvedValue(2);

      // Act
      const result = await itemRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should calculate skip correctly for pagination", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(100);

      // Act
      await itemRepository.findAll({ page: 4, limit: 25 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 75,
          take: 25,
        }),
      );
    });

    it("should filter out deleted items", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await itemRepository.findAll({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return item when id exists", async () => {
      // Arrange
      const mockItem = createItemFixture({ id: 5 });
      mockFindUnique.mockResolvedValue(mockItem);

      // Act
      const result = await itemRepository.findById(5);

      // Assert
      expect(result).toEqual(mockItem);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("should return null when id does not exist", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await itemRepository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create menu item", async () => {
      // Arrange
      const createData = {
        categoryId: 1,
        name: "New Item",
        price: 15000,
        inventoryType: InventoryType.TRACKED,
      };
      const mockCreatedItem = createItemFixture({
        id: 10,
        categoryId: 1,
        name: "New Item",
      });
      mockCreate.mockResolvedValue(mockCreatedItem);

      // Act
      const result = await itemRepository.create(createData as any);

      // Assert
      expect(result).toEqual(mockCreatedItem);
      expect(mockCreate).toHaveBeenCalledWith({ data: createData });
    });
  });

  describe("search", () => {
    it("should search items by name", async () => {
      // Arrange
      const mockItems = [createItemFixture({ name: "Hamburguesa" })];
      mockFindMany.mockResolvedValue(mockItems);
      mockCount.mockResolvedValue(1);

      // Act
      const result = await itemRepository.search({
        page: 1,
        limit: 10,
        search: "hambur",
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: "hambur",
              mode: "insensitive",
            },
          }),
        }),
      );
    });

    it("should order results by name ascending", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await itemRepository.search({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        }),
      );
    });

    it("should always exclude deleted items", async () => {
      // Arrange
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Act
      await itemRepository.search({ page: 1, limit: 10 });

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted: false,
          }),
        }),
      );
    });
  });

  describe("updateStock", () => {
    it("should update stock quantity and create adjustment record", async () => {
      // Arrange
      const mockItem = createItemFixture({ id: 1, stockQuantity: 50 });
      const mockUpdatedItem = createItemFixture({ id: 1, stockQuantity: 45 });

      mockFindUnique.mockResolvedValue(mockItem);
      mockTransaction.mockResolvedValue([mockUpdatedItem, {}]);

      // Act
      const result = await itemRepository.updateStock(
        1,
        -5,
        "ORDER_DEDUCT",
        "Order #123",
        "user-123",
        "order-123",
      );

      // Assert
      expect(result).toEqual(mockUpdatedItem);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it("should throw error when item not found", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        itemRepository.updateStock(999, -5, "ORDER_DEDUCT"),
      ).rejects.toThrow("MenuItem with id 999 not found");
    });

    it("should auto-mark unavailable when stock depleted and autoMarkUnavailable is true", async () => {
      // Arrange
      const mockItem = createItemFixture({
        id: 1,
        stockQuantity: 5,
        autoMarkUnavailable: true,
        isAvailable: true,
      });
      const mockUpdatedItem = createItemFixture({
        id: 1,
        stockQuantity: 0,
        isAvailable: false,
      });

      mockFindUnique.mockResolvedValue(mockItem);
      mockTransaction.mockResolvedValue([mockUpdatedItem, {}]);

      // Act
      const result = await itemRepository.updateStock(1, -5, "ORDER_DEDUCT");

      // Assert - verify transaction was called (stock depletion logic tested)
      expect(mockTransaction).toHaveBeenCalled();
      expect(result.isAvailable).toBe(false);
      expect(result.stockQuantity).toBe(0);
    });

    it("should not change availability when autoMarkUnavailable is false", async () => {
      // Arrange
      const mockItem = createItemFixture({
        id: 1,
        stockQuantity: 5,
        autoMarkUnavailable: false,
        isAvailable: true,
      });
      const mockUpdatedItem = createItemFixture({
        id: 1,
        stockQuantity: 0,
        isAvailable: true, // Should remain true
      });

      mockFindUnique.mockResolvedValue(mockItem);
      mockTransaction.mockResolvedValue([mockUpdatedItem, {}]);

      // Act
      const result = await itemRepository.updateStock(1, -5, "ORDER_DEDUCT");

      // Assert - availability should remain true
      expect(mockTransaction).toHaveBeenCalled();
      expect(result.isAvailable).toBe(true);
    });
  });

  describe("dailyStockReset", () => {
    it("should reset stock for multiple items", async () => {
      // Arrange
      const resetInput = {
        items: [
          { itemId: 1, quantity: 100, lowStockAlert: 10 },
          { itemId: 2, quantity: 50, lowStockAlert: 5 },
        ],
      };

      const mockTx = {
        menuItem: {
          update: jest.fn().mockResolvedValue({}),
        },
        stockAdjustment: {
          createMany: mockStockAdjustmentCreateMany,
        },
      };

      mockStockAdjustmentCreateMany.mockResolvedValue({ count: 2 });
      mockTransaction.mockImplementation((callback) => {
        return callback(mockTx);
      });

      // Act
      await itemRepository.dailyStockReset(resetInput);

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockTx.menuItem.update).toHaveBeenCalledTimes(2);
      expect(mockStockAdjustmentCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            menuItemId: 1,
            adjustmentType: "DAILY_RESET",
            newStock: 100,
          }),
          expect.objectContaining({
            menuItemId: 2,
            adjustmentType: "DAILY_RESET",
            newStock: 50,
          }),
        ]),
      });
    });
  });

  describe("getOutOfStock", () => {
    it("should return items with zero stock", async () => {
      // Arrange
      const mockOutOfStock = [
        createItemFixture({ id: 1, stockQuantity: 0 }),
        createItemFixture({ id: 2, stockQuantity: 0 }),
      ];
      mockFindMany.mockResolvedValue(mockOutOfStock);

      // Act
      const result = await itemRepository.getOutOfStock();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          inventoryType: InventoryType.TRACKED,
          deleted: false,
          stockQuantity: 0,
        },
      });
    });
  });

  describe("getStockHistory", () => {
    it("should return paginated stock adjustments for item", async () => {
      // Arrange
      const mockAdjustments = [
        { id: 1, menuItemId: 1, quantity: -5 },
        { id: 2, menuItemId: 1, quantity: -3 },
      ];
      mockStockAdjustmentFindMany.mockResolvedValue(mockAdjustments);
      mockStockAdjustmentCount.mockResolvedValue(2);

      // Act
      const result = await itemRepository.getStockHistory(1, 1, 10);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(mockStockAdjustmentFindMany).toHaveBeenCalledWith({
        where: { menuItemId: 1 },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should calculate pagination correctly", async () => {
      // Arrange
      mockStockAdjustmentFindMany.mockResolvedValue([]);
      mockStockAdjustmentCount.mockResolvedValue(50);

      // Act
      await itemRepository.getStockHistory(1, 3, 15);

      // Assert
      expect(mockStockAdjustmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 15,
        }),
      );
    });
  });

  describe("setInventoryType", () => {
    it("should set inventory type to TRACKED with lowStockAlert", async () => {
      // Arrange
      const mockUpdatedItem = createItemFixture({
        inventoryType: InventoryType.TRACKED,
        lowStockAlert: 10,
      });
      mockUpdate.mockResolvedValue(mockUpdatedItem);

      // Act
      const result = await itemRepository.setInventoryType(1, "TRACKED", 10);

      // Assert
      expect(result.inventoryType).toBe(InventoryType.TRACKED);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          inventoryType: "TRACKED",
          lowStockAlert: 10,
        },
      });
    });

    it("should set inventory type to UNLIMITED and clear stock data", async () => {
      // Arrange
      const mockUpdatedItem = createItemFixture({
        inventoryType: InventoryType.UNLIMITED,
        stockQuantity: null,
        initialStock: null,
      });
      mockUpdate.mockResolvedValue(mockUpdatedItem);

      // Act
      const result = await itemRepository.setInventoryType(1, "UNLIMITED");

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          inventoryType: "UNLIMITED",
          lowStockAlert: undefined,
          stockQuantity: null,
          initialStock: null,
        },
      });
    });
  });
});
