import request from "supertest";
import { app } from "../../../app";
import { getTestDatabase } from "../../tests/shared/test-database";

describe("Customers Integration Tests", () => {
  let testDb: any;

  beforeAll(async () => {
    testDb = await getTestDatabase();
  });

  beforeEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  describe("POST /api/v1/customers", () => {
    it("should create a customer successfully", async () => {
      const customerData = {
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        email: "john.doe@example.com",
      };

      const response = await request(app)
        .post("/api/v1/customers")
        .set("Authorization", "Bearer test-token")
        .send(customerData)
        .expect(201);

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
        .set("Authorization", "Bearer test-token")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/customers/:id", () => {
    let createdCustomer: any;

    beforeEach(async () => {
      createdCustomer = await testDb.customer.create({
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        email: "john.doe@example.com",
      });
    });

    it("should return customer by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/customers/${createdCustomer.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCustomer.id);
      expect(response.body.data.firstName).toBe("John");
    });

    it("should return 404 for non-existent ID", async () => {
      const response = await request(app)
        .get("/api/v1/customers/non-existent-id")
        .set("Authorization", "Bearer test-token")
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/customers", () => {
    it("should return paginated customers list", async () => {
      // Create multiple customers
      await testDb.customer.createMany([
        { firstName: "Alice", lastName: "Johnson", phone: "+1111111111" },
        { firstName: "Bob", lastName: "Smith", phone: "+2222222222" },
        { firstName: "Charlie", lastName: "Brown", phone: "+3333333333" },
      ]);

      const response = await request(app)
        .get("/api/v1/customers")
        .set("Authorization", "Bearer test-token")
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });
  });
});
