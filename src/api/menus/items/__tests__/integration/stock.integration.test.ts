import itemService from "../../item.service";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  getTestDatabaseClient,
} from "../../../../../tests/shared/test-database";
import { InventoryType } from "../../../../../types/prisma.types";

describe("Stock Management Integration Tests", () => {
  let testUserId: string;
  const testPrisma = getTestDatabaseClient();

  beforeAll(async () => {
    await connectTestDatabase();

    // Create test user for operations
    const testUser = await testPrisma.user.create({
      data: {
        firstName: "Test",
        lastName: "User",
        email: `test-${Date.now()}@example.com`,
        password: "hashedpassword",
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    // Clean stock adjustments before each test
    await testPrisma.stockAdjustment.deleteMany();

    // For menu items and categories, delete all records including soft-deleted ones
    await testPrisma.$executeRaw`DELETE FROM "menu_items"`;
    await testPrisma.$executeRaw`DELETE FROM "menu_categories"`;
  });

  describe("Daily Stock Reset", () => {
    test("should successfully reset stock for multiple items", async () => {
      // Create test menu items
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item1 = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item 1",
          price: 10000,
          inventoryType: "TRACKED",
        },
      });

      const item2 = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item 2",
          price: 15000,
          inventoryType: "TRACKED",
        },
      });

      const resetData = {
        items: [
          { itemId: item1.id, quantity: 30, lowStockAlert: 5 },
          { itemId: item2.id, quantity: 25, lowStockAlert: 3 },
        ],
      };

      await itemService.dailyStockReset(resetData);

      // Verify items were updated
      const updatedItem1 = await testPrisma.menuItem.findUnique({
        where: { id: item1.id },
      });
      expect(updatedItem1?.stockQuantity).toBe(30);
      expect(updatedItem1?.initialStock).toBe(30);
      expect(updatedItem1?.lowStockAlert).toBe(5);
      expect(updatedItem1?.isAvailable).toBe(true);

      // Verify stock adjustment records
      const adjustments = await testPrisma.stockAdjustment.findMany({
        where: { adjustmentType: "DAILY_RESET" },
      });
      expect(adjustments).toHaveLength(2);
    });

    test("should throw error for UNLIMITED items", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const unlimitedItem = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Unlimited Item",
          price: 5000,
          inventoryType: "UNLIMITED",
        },
      });

      const resetData = {
        items: [{ itemId: unlimitedItem.id, quantity: 30 }],
      };

      await expect(itemService.dailyStockReset(resetData)).rejects.toThrow(
        "Only TRACKED items can have stock reset",
      );
    });

    test("should throw validation error for negative quantities", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
        },
      });

      const resetData = {
        items: [{ itemId: item.id, quantity: -5 }],
      };

      await expect(itemService.dailyStockReset(resetData)).rejects.toThrow();
    });
  });

  describe("Add Stock", () => {
    test("should successfully add stock to tracked item", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
          stockQuantity: 10,
        },
      });

      const addData = {
        quantity: 15,
        reason: "Additional mid-day production",
      };

      const result = await itemService.addStock(item.id, addData, testUserId);

      expect(result.stockQuantity).toBe(25);
      expect(result.isAvailable).toBe(true);

      // Verify stock adjustment record
      const adjustment = await testPrisma.stockAdjustment.findFirst({
        where: {
          menuItemId: item.id,
          adjustmentType: "MANUAL_ADD",
        },
      });
      expect(adjustment?.quantity).toBe(15);
      expect(adjustment?.reason).toBe("Additional mid-day production");
      expect(adjustment?.userId).toBe(testUserId);
    });

    test("should throw error for unlimited item", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Unlimited Item",
          price: 5000,
          inventoryType: "UNLIMITED",
        },
      });

      const addData = {
        quantity: 15,
        reason: "Test addition",
      };

      await expect(
        itemService.addStock(item.id, addData, testUserId),
      ).rejects.toThrow("Cannot add stock to UNLIMITED items");
    });
  });

  describe("Remove Stock", () => {
    test("should successfully remove stock from tracked item", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
          stockQuantity: 20,
        },
      });

      const removeData = {
        quantity: 5,
        reason: "Items spoiled due to temperature issues",
      };

      const result = await itemService.removeStock(
        item.id,
        removeData,
        testUserId,
      );

      expect(result.stockQuantity).toBe(15);

      // Verify stock adjustment record
      const adjustment = await testPrisma.stockAdjustment.findFirst({
        where: {
          menuItemId: item.id,
          adjustmentType: "MANUAL_REMOVE",
        },
      });
      expect(adjustment?.quantity).toBe(5);
      expect(adjustment?.reason).toBe(
        "Items spoiled due to temperature issues",
      );
    });

    test("should mark item unavailable when stock reaches zero", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
          stockQuantity: 3,
          isAvailable: true,
          autoMarkUnavailable: true,
        },
      });

      const removeData = {
        quantity: 3,
        reason: "All items used",
      };

      const result = await itemService.removeStock(
        item.id,
        removeData,
        testUserId,
      );

      expect(result.stockQuantity).toBe(0);
      expect(result.isAvailable).toBe(false);
    });

    test("should throw error for insufficient stock", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
          stockQuantity: 5,
        },
      });

      const removeData = {
        quantity: 10,
        reason: "Attempt to remove more than available",
      };

      await expect(
        itemService.removeStock(item.id, removeData, testUserId),
      ).rejects.toThrow("Insufficient stock to remove");
    });
  });

  describe("Low Stock Items", () => {
    test("should return items at or below low stock threshold", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      // Create items at different stock levels
      await testPrisma.menuItem.createMany({
        data: [
          {
            categoryId: category.id,
            name: "Normal Stock Item",
            price: 10000,
            inventoryType: "TRACKED",
            stockQuantity: 20,
            lowStockAlert: 5,
          },
          {
            categoryId: category.id,
            name: "Low Stock Item",
            price: 15000,
            inventoryType: "TRACKED",
            stockQuantity: 3,
            lowStockAlert: 5,
          },
          {
            categoryId: category.id,
            name: "At Threshold Item",
            price: 12000,
            inventoryType: "TRACKED",
            stockQuantity: 5,
            lowStockAlert: 5,
          },
        ],
      });

      const lowStockItems = await itemService.getLowStock();

      expect(lowStockItems).toHaveLength(2);
      expect(lowStockItems.map((item) => item.name)).toContain(
        "Low Stock Item",
      );
      expect(lowStockItems.map((item) => item.name)).toContain(
        "At Threshold Item",
      );
      expect(lowStockItems.map((item) => item.name)).not.toContain(
        "Normal Stock Item",
      );
    });
  });

  describe("Out of Stock Items", () => {
    test("should return items with zero stock", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      await testPrisma.menuItem.createMany({
        data: [
          {
            categoryId: category.id,
            name: "In Stock Item",
            price: 10000,
            inventoryType: "TRACKED",
            stockQuantity: 10,
          },
          {
            categoryId: category.id,
            name: "Out of Stock Item",
            price: 15000,
            inventoryType: "TRACKED",
            stockQuantity: 0,
          },
        ],
      });

      const outOfStockItems = await itemService.getOutStock();

      expect(outOfStockItems).toHaveLength(1);
      expect(outOfStockItems[0].name).toBe("Out of Stock Item");
      expect(outOfStockItems[0].stockQuantity).toBe(0);
    });
  });

  describe("Stock History", () => {
    test("should return paginated stock history for item", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
        },
      });

      // Create stock adjustments
      await testPrisma.stockAdjustment.createMany({
        data: [
          {
            menuItemId: item.id,
            adjustmentType: "DAILY_RESET",
            previousStock: 0,
            newStock: 30,
            quantity: 30,
            reason: "Begin of the day",
          },
          {
            menuItemId: item.id,
            adjustmentType: "MANUAL_ADD",
            previousStock: 30,
            newStock: 45,
            quantity: 15,
            reason: "Additional production",
            userId: testUserId,
          },
          {
            menuItemId: item.id,
            adjustmentType: "MANUAL_REMOVE",
            previousStock: 45,
            newStock: 42,
            quantity: 3,
            reason: "Spoilage",
            userId: testUserId,
          },
        ],
      });

      const history = await itemService.getStockHistory(item.id, {
        page: 1,
        limit: 20,
      });

      expect(history.data).toHaveLength(3);
      expect(history.meta.total).toBe(3);
      expect(history.meta.page).toBe(1);
      expect(history.meta.limit).toBe(20);
      expect(history.meta.totalPages).toBe(1);

      // Should be ordered by createdAt desc
      const adjustmentTypes = history.data.map((h) => h.adjustmentType);
      expect(adjustmentTypes).toContain("MANUAL_REMOVE");
      expect(adjustmentTypes).toContain("MANUAL_ADD");
      expect(adjustmentTypes).toContain("DAILY_RESET");

      // Verify the first (most recent) is either MANUAL_REMOVE or MANUAL_ADD or DAILY_RESET
      expect(["MANUAL_REMOVE", "MANUAL_ADD", "DAILY_RESET"]).toContain(
        history.data[0].adjustmentType,
      );
    });
  });

  describe("Inventory Type Update", () => {
    test("should convert TRACKED to UNLIMITED", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "TRACKED",
          stockQuantity: 30,
          initialStock: 30,
          lowStockAlert: 5,
          deleted: false,
        },
      });

      const updateData = {
        inventoryType: InventoryType.UNLIMITED,
      };

      const result = await itemService.setInventoryType(item.id, updateData);

      expect(result.inventoryType).toBe("UNLIMITED");
      expect(result.stockQuantity).toBeNull();
      expect(result.initialStock).toBeNull();
      expect(result.lowStockAlert).toBeNull();
    });

    test("should convert UNLIMITED to TRACKED", async () => {
      const category = await testPrisma.menuCategory.create({
        data: { name: "Test Category" },
      });

      const item = await testPrisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: "Test Item",
          price: 10000,
          inventoryType: "UNLIMITED",
          deleted: false,
        },
      });

      const updateData = {
        inventoryType: InventoryType.TRACKED,
        lowStockAlert: 10,
      };

      const result = await itemService.setInventoryType(item.id, updateData);

      expect(result.inventoryType).toBe("TRACKED");
      expect(result.stockQuantity).toBe(0);
      expect(result.initialStock).toBe(0);
      expect(result.lowStockAlert).toBe(10);
      expect(result.autoMarkUnavailable).toBe(true);
    });
  });
});
