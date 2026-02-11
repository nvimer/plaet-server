import {
  getTestDatabaseClient,
  connectTestDatabase,
  disconnectTestDatabase,
} from "../../../../tests/shared";
import { cleanupAllTestData } from "../../../../tests/shared/cleanup";
import {
  createTestUser,
  deleteAllTestUsers,
} from "../../../users/__tests__/helpers/user.database";
import {
  createTestMenuCategory,
  createTestMenuItem,
  deleteAllTestOrders,
  deleteAllTestMenuItems,
  createTestTable,
  deleteAllTestTables,
} from "../helpers";
import { OrderStatus, OrderType } from "../../../../types/prisma.types";
import orderService from "../../order.service";

// Skip if not running integration tests
const runIntegrationTests = process.env.TEST_TYPE === "integration";

(runIntegrationTests ? describe : describe.skip)(
  "OrderService - Integration Tests",
  () => {
    // Test data references
    let testWaiter: Awaited<ReturnType<typeof createTestUser>>;
    let testCategory: Awaited<ReturnType<typeof createTestMenuCategory>>;
    let testMenuItem: Awaited<ReturnType<typeof createTestMenuItem>>;
    let testTable: Awaited<ReturnType<typeof createTestTable>>;

    beforeAll(async () => {
      await connectTestDatabase();
    });

    afterAll(async () => {
      await disconnectTestDatabase();
    });

    beforeEach(async () => {
      // Clean all data before each test
      await cleanupAllTestData();

      // Setup fresh test data
      testWaiter = await createTestUser({ email: "waiter@integration.test" });
      testCategory = await createTestMenuCategory({ name: "Test Category" });
      testMenuItem = await createTestMenuItem(testCategory.id, {
        name: "Test Item",
        stockQuantity: 100,
      });
      testTable = await createTestTable({ number: "T1" });
    });

    afterEach(async () => {
      // Cleanup is handled by beforeEach, but explicit cleanup for safety
      await deleteAllTestOrders();
    });

    describe("createOrder", () => {
      it("should create order in database successfully", async () => {
        // Arrange
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [
            {
              menuItemId: testMenuItem.id,
              quantity: 2,
              notes: "Sin cebolla",
            },
          ],
        };

        // Act
        const result = await orderService.createOrder(testWaiter.id, orderData);

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.status).toBe(OrderStatus.PENDING);
        expect(result.waiterId).toBe(testWaiter.id);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].quantity).toBe(2);
        expect(result.items[0].notes).toBe("Sin cebolla");
      });

      it("should calculate total amount correctly", async () => {
        // Arrange
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [
            { menuItemId: testMenuItem.id, quantity: 2 },
            { menuItemId: testMenuItem.id, quantity: 1 },
          ],
        };

        // Act
        const result = await orderService.createOrder(testWaiter.id, orderData);

        // Assert - Total should be price * 3 (2 + 1)
        const expectedTotal = Number(testMenuItem.price) * 3;
        expect(Number(result.totalAmount)).toBe(expectedTotal);
      });

      it("should deduct stock for TRACKED items", async () => {
        // Arrange
        const stockQuantity = testMenuItem.stockQuantity!;
        const orderQuantity = 5;

        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: orderQuantity }],
        };

        // Act
        await orderService.createOrder(testWaiter.id, orderData);

        // Assert - Check stock was deducted
        const db = getTestDatabaseClient();
        const updatedItem = await db.menuItem.findUnique({
          where: { id: testMenuItem.id },
        });

        expect(updatedItem?.stockQuantity).toBe(stockQuantity - orderQuantity);
      });

      it("should reject order with insufficient stock", async () => {
        // Arrange - Request more than available
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 9999 }],
        };

        // Act & Assert
        await expect(
          orderService.createOrder(testWaiter.id, orderData),
        ).rejects.toThrow(/insufficient stock/i);
      });

      it("should reject order with unavailable item", async () => {
        // Arrange - Mark item as unavailable
        const db = getTestDatabaseClient();
        await db.menuItem.update({
          where: { id: testMenuItem.id },
          data: { isAvailable: false },
        });

        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };

        // Act & Assert
        await expect(
          orderService.createOrder(testWaiter.id, orderData),
        ).rejects.toThrow(/not available/i);
      });
    });

    describe("findOrderById", () => {
      it("should find existing order with all relations", async () => {
        // Arrange - Create an order first
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };
        const createdOrder = await orderService.createOrder(
          testWaiter.id,
          orderData,
        );

        // Act
        const result = await orderService.findOrderById(createdOrder.id);

        // Assert
        expect(result).toBeDefined();
        expect(result?.id).toBe(createdOrder.id);
        expect(result?.items).toHaveLength(1);
        expect(result?.waiter).toBeDefined();
        expect(result?.waiter?.id).toBe(testWaiter.id);
      });

      it("should throw error for non-existent order", async () => {
        // Act & Assert
        await expect(
          orderService.findOrderById("non-existent-uuid-id"),
        ).rejects.toThrow(/not found/i);
      });
    });

    describe("updateOrderStatus", () => {
      it("should update order status successfully", async () => {
        // Arrange
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };
        const order = await orderService.createOrder(testWaiter.id, orderData);

        // Act
        const result = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.SENT_TO_CASHIER,
        });

        // Assert
        expect(result.status).toBe(OrderStatus.SENT_TO_CASHIER);
      });

      it("should reject status change from DELIVERED", async () => {
        // Arrange - Create and mark as delivered
        const db = getTestDatabaseClient();
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };
        const order = await orderService.createOrder(testWaiter.id, orderData);
        await db.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        });

        // Act & Assert
        await expect(
          orderService.updateOrderStatus(order.id, {
            status: OrderStatus.CANCELLED,
          }),
        ).rejects.toThrow(/cannot change status/i);
      });
    });

    describe("cancelOrder", () => {
      it("should cancel order and revert stock", async () => {
        // Arrange
        const stockQuantity = testMenuItem.stockQuantity!;
        const orderQuantity = 5;

        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: orderQuantity }],
        };
        const order = await orderService.createOrder(testWaiter.id, orderData);

        // Verify stock was deducted
        const db = getTestDatabaseClient();
        const afterOrder = await db.menuItem.findUnique({
          where: { id: testMenuItem.id },
        });
        expect(afterOrder?.stockQuantity).toBe(stockQuantity - orderQuantity);

        // Act - Cancel the order
        const result = await orderService.cancelOrder(order.id);

        // Assert - Status changed
        expect(result.status).toBe(OrderStatus.CANCELLED);

        // Assert - Stock reverted
        const afterCancel = await db.menuItem.findUnique({
          where: { id: testMenuItem.id },
        });
        expect(afterCancel?.stockQuantity).toBe(stockQuantity);
      });

      it("should reject cancellation of DELIVERED order", async () => {
        // Arrange
        const db = getTestDatabaseClient();
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };
        const order = await orderService.createOrder(testWaiter.id, orderData);
        await db.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        });

        // Act & Assert
        await expect(orderService.cancelOrder(order.id)).rejects.toThrow(
          /cannot cancel/i,
        );
      });
    });

    describe("findAllOrders", () => {
      it("should return paginated orders", async () => {
        // Arrange - Create multiple orders
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };

        await orderService.createOrder(testWaiter.id, orderData);
        await orderService.createOrder(testWaiter.id, orderData);
        await orderService.createOrder(testWaiter.id, orderData);

        // Act
        const result = await orderService.findAllOrders({ page: 1, limit: 10 });

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.meta.total).toBe(3);
        expect(result.meta.page).toBe(1);
      });

      it("should filter by status", async () => {
        // Arrange - Create orders with different statuses
        const db = getTestDatabaseClient();
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
        };

        const order1 = await orderService.createOrder(testWaiter.id, orderData);
        const order2 = await orderService.createOrder(testWaiter.id, orderData);

        // Mark one as IN_KITCHEN
        await db.order.update({
          where: { id: order2.id },
          data: { status: OrderStatus.IN_KITCHEN },
        });

        // Act - Filter by PENDING
        const result = await orderService.findAllOrders({
          page: 1,
          limit: 10,
          status: OrderStatus.PENDING,
        });

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe(order1.id);
      });
    });

    describe("Order Workflow - Complete Lifecycle", () => {
      it("should handle complete order lifecycle", async () => {
        // Arrange
        const orderData = {
          tableId: testTable.id,
          type: OrderType.DINE_IN,
          items: [{ menuItemId: testMenuItem.id, quantity: 2 }],
        };

        // Step 1: Create order
        const order = await orderService.createOrder(testWaiter.id, orderData);
        expect(order.status).toBe(OrderStatus.PENDING);

        // Step 2: Send to cashier
        const sentToCashier = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.SENT_TO_CASHIER,
        });
        expect(sentToCashier.status).toBe(OrderStatus.SENT_TO_CASHIER);

        // Step 3: Mark as paid
        const paid = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.PAID,
        });
        expect(paid.status).toBe(OrderStatus.PAID);

        // Step 4: Send to kitchen
        const inKitchen = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.IN_KITCHEN,
        });
        expect(inKitchen.status).toBe(OrderStatus.IN_KITCHEN);

        // Step 5: Mark as ready
        const ready = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.READY,
        });
        expect(ready.status).toBe(OrderStatus.READY);

        // Step 6: Deliver
        const delivered = await orderService.updateOrderStatus(order.id, {
          status: OrderStatus.DELIVERED,
        });
        expect(delivered.status).toBe(OrderStatus.DELIVERED);

        // Verify final state in database
        const finalOrder = await orderService.findOrderById(order.id);
        expect(finalOrder?.status).toBe(OrderStatus.DELIVERED);
      });
    });
  },
);
