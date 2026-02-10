import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../../app";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  getTestDatabaseClient,
} from "../../../../tests/shared/test-database";
import { config } from "../../../../config";

describe("Customers Integration Tests", () => {
  let testDb: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    await connectTestDatabase();
    testDb = getTestDatabaseClient();

    // Create or get existing admin role
    const adminRole = await testDb.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "Administrator role for testing",
      },
    });

    // Create test user and assign role
    testUser = await testDb.user.create({
      data: {
        firstName: "Test",
        lastName: "User",
        email: `test-admin-${Date.now()}@example.com`,
        password: "hashedpassword",
      },
    });

    // Assign role to user
    await testDb.userRole.create({
      data: {
        userId: testUser.id,
        roleId: adminRole.id,
      },
    });

    // Generate JWT token for test user
    // The JWT strategy expects 'sub' (subject) field for user ID
    authToken = jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: adminRole.name,
      },
      config.jwtSecret,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("POST /api/v1/customers", () => {
    it("should create a customer successfully", async () => {
      const uniqueSuffix =
        `${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(-9);
      const customerData = {
        firstName: "John",
        lastName: "Doe",
        phone: `+57${uniqueSuffix}`,
        email: `john.doe.${Date.now()}@example.com`,
      };

      const response = await request(app)
        .post("/api/v1/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(customerData);

      if (response.status !== 201) {
        console.log(
          "Error:",
          response.status,
          JSON.stringify(response.body, null, 2),
        );
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Customer created successfully");
      expect(response.body.data.firstName).toBe(customerData.firstName);
      expect(response.body.data.lastName).toBe(customerData.lastName);
      expect(response.body.data.phone).toBe(customerData.phone);
      expect(response.body.data.email).toBe(customerData.email);
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        firstName: "",
        lastName: "Doe",
        phone: "+1234567890",
      };

      const response = await request(app)
        .post("/api/v1/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/customers/:id", () => {
    let createdCustomer: any;

    beforeEach(async () => {
      const uniqueSuffix =
        Date.now().toString().slice(-3) + Math.floor(Math.random() * 100);
      createdCustomer = await testDb.customer.create({
        data: {
          firstName: "John",
          lastName: "Doe",
          phone: `+12345${uniqueSuffix}`,
          email: "john.doe@example.com",
        },
      });
    });

    it("should return customer by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/customers/${createdCustomer.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCustomer.id);
      expect(response.body.data.firstName).toBe("John");
    });

    it("should return 404 for non-existent ID", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440001";
      const response = await request(app)
        .get(`/api/v1/customers/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/customers", () => {
    it("should return paginated customers list", async () => {
      // Create multiple customers
      const uniqueSuffix =
        Date.now().toString().slice(-3) + Math.floor(Math.random() * 100);
      await testDb.customer.createMany({
        data: [
          {
            firstName: "Alice",
            lastName: "Johnson",
            phone: `+111${uniqueSuffix}1`,
          },
          {
            firstName: "Bob",
            lastName: "Smith",
            phone: `+222${uniqueSuffix}2`,
          },
          {
            firstName: "Charlie",
            lastName: "Brown",
            phone: `+333${uniqueSuffix}3`,
          },
        ],
      });

      const response = await request(app)
        .get("/api/v1/customers?limit=2")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });
  });
});
