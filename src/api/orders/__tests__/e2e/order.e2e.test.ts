import request from "supertest";
import app from "../../../../app";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  getTestDatabaseClient,
} from "../../../../tests/shared";
import { cleanupAllTestData } from "../../../../tests/shared/cleanup";
import {
  createTestUser,
  deleteAllTestUsers,
} from "../../../users/__tests__/helpers/user.database";
import {
  createTestMenuCategory,
  createTestMenuItem,
  createTestTable,
  deleteAllTestOrders,
} from "../helpers";
import { createOrderPayload } from "../helpers/order.fixtures";
import { OrderType, OrderStatus } from "../../../../types/prisma.types";
import hasherUtils from "../../../../utils/hasher.utils";

// Skip if not running E2E tests
const runE2ETests = process.env.TEST_TYPE === "e2e";

(runE2ETests ? describe : describe.skip)("Orders API - E2E Tests", () => {
  // Test data
  let authToken: string;
  let testWaiter: Awaited<ReturnType<typeof createTestUser>>;
  let testCategory: Awaited<ReturnType<typeof createTestMenuCategory>>;
  let testMenuItem: Awaited<ReturnType<typeof createTestMenuItem>>;
  let testTable: Awaited<ReturnType<typeof createTestTable>>;

  beforeAll(async () => {
    await connectTestDatabase();
    await cleanupAllTestData();

    // Create test data
    // Hash password before creating user (as it would be in production)
    const hashedPassword = hasherUtils.hash("password123");
    testWaiter = await createTestUser({
      email: "waiter@e2e.test",
      password: hashedPassword, // Hashed password for login
    });
    testCategory = await createTestMenuCategory({ name: "E2E Category" });
    testMenuItem = await createTestMenuItem(testCategory.id, {
      name: "E2E Item",
      stockQuantity: 100,
    });
    testTable = await createTestTable({ number: "E2E-1" });

    // Get auth token via login
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: testWaiter.email,
      password: "password123",
    });

    // Verify login was successful
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data).toBeDefined();

    // Token structure: { access: { token: string, expires: string }, refresh: { token: string, expires: string } }
    expect(loginResponse.body.data.access).toBeDefined();
    expect(loginResponse.body.data.access.token).toBeDefined();

    authToken = loginResponse.body.data.access.token;
  });

  beforeEach(async () => {
    // Clean up orders before each test (keep users/menu items)
    await deleteAllTestOrders();
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await disconnectTestDatabase();
  });

  describe("POST /api/v1/orders", () => {
    it("should create order successfully", async () => {
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
      const response = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.status).toBe(OrderStatus.PENDING);
      expect(response.body.data.items).toHaveLength(1);
    });

    it("should return 400 for invalid data", async () => {
      // Arrange
      const invalidOrderData = {
        tableId: "invalid",
        type: "INVALID_TYPE",
        items: [],
      };

      // Act
      const response = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidOrderData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication", async () => {
      // Arrange
      const orderData = createOrderPayload();

      // Act
      const response = await request(app)
        .post("/api/v1/orders")
        .send(orderData);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/orders", () => {
    it("should return paginated orders", async () => {
      // Arrange - Create some orders first
      const orderData = {
        tableId: testTable.id,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      };

      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      // Act
      const response = await request(app)
        .get("/api/v1/orders?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty("page");
      expect(response.body.meta).toHaveProperty("total");
    });
  });

  describe("GET /api/v1/orders/:id", () => {
    it("should return specific order", async () => {
      // Arrange - Create order
      const orderData = {
        tableId: testTable.id,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      };

      const createResponse = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      const orderId = createResponse.body.data.id;

      // Act
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(orderId);
    });

    it("should return 404 for non-existent order", async () => {
      // Act
      const response = await request(app)
        .get("/api/v1/orders/non-existent-uuid-id")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/orders/:id/status", () => {
    it("should update order status", async () => {
      // Arrange - Create order
      const orderData = {
        tableId: testTable.id,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      };

      const createResponse = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      const orderId = createResponse.body.data.id;

      // Act
      const response = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: OrderStatus.IN_KITCHEN });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(OrderStatus.IN_KITCHEN);
    });

    it("should reject invalid status transitions", async () => {
      // Arrange - Create order and mark as delivered
      const db = getTestDatabaseClient();
      const orderData = {
        tableId: testTable.id,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      };

      const createResponse = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      const orderId = createResponse.body.data.id;

      // Mark as delivered directly in DB
      await db.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
      });

      // Act - Try to change status from DELIVERED
      const response = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: OrderStatus.CANCELLED });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/orders/:id (Cancel)", () => {
    it("should cancel order successfully", async () => {
      // Arrange
      const orderData = {
        tableId: testTable.id,
        type: OrderType.DINE_IN,
        items: [{ menuItemId: testMenuItem.id, quantity: 1 }],
      };

      const createResponse = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      const orderId = createResponse.body.data.id;

      // Act
      const response = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
