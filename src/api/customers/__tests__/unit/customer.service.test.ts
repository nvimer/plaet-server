import { CustomerService } from "../../customer.service";
import { CustomerRepository } from "../../customer.repository";
import { Customer } from "@prisma/client";

// Mock dependencies
jest.mock("../../customer.repository");
jest.mock("../../../database/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

describe("CustomerService", () => {
  let customerService: CustomerService;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;

  const existingCustomer: Customer = {
    id: "customer-123",
    firstName: "John",
    lastName: "Doe",
    phone: "+1234567890",
    email: "john.doe@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
    deletedAt: null,
  };

  beforeEach(() => {
    mockCustomerRepository =
      new CustomerRepository() as jest.Mocked<CustomerRepository>;
    customerService = new CustomerService();
    // Replace repository instance with mock
    (customerService as any).customerRepository = mockCustomerRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCustomer", () => {
    const validCustomerData = {
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
      email: "john.doe@example.com",
    };

    const existingCustomer: Customer = {
      id: "customer-123",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+0987654321",
      email: "jane.smith@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      deletedAt: null,
    };

    it("should create customer successfully with valid data", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(null);
      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.create.mockResolvedValue(existingCustomer);

      // Act
      const result = await customerService.createCustomer(validCustomerData);

      // Assert
      expect(result).toEqual(existingCustomer);
      expect(mockCustomerRepository.findByPhone).toHaveBeenCalledWith(
        "+1234567890",
      );
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith(
        "john.doe@example.com",
      );
      expect(mockCustomerRepository.create).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        email: "john.doe@example.com",
      });
    });

    it("should throw error when phone number already exists", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(
        customerService.createCustomer(validCustomerData),
      ).rejects.toThrow("Phone number already exists");
    });

    it("should create customer without email", async () => {
      // Arrange
      const customerDataWithoutEmail = {
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
      };

      mockCustomerRepository.findByPhone.mockResolvedValue(null);
      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.create.mockResolvedValue(existingCustomer);

      // Act
      const result = await customerService.createCustomer(
        customerDataWithoutEmail,
      );

      // Assert
      expect(result).toEqual(existingCustomer);
      expect(mockCustomerRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockCustomerRepository.create).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        email: null,
      });
    });
  });

  describe("getCustomerById", () => {
    const existingCustomer: Customer = {
      id: "customer-123",
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
      email: "john.doe@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      deletedAt: null,
    };

    it("should return customer when found", async () => {
      // Arrange
      mockCustomerRepository.findById.mockResolvedValue(existingCustomer);

      // Act
      const result = await customerService.getCustomerById("customer-123");

      // Assert
      expect(result).toEqual(existingCustomer);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(
        "customer-123",
      );
    });

    it("should throw error when customer not found", async () => {
      // Arrange
      mockCustomerRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        customerService.getCustomerById("nonexistent-id"),
      ).rejects.toThrow("Customer not found");
    });
  });

  describe("getCustomerByPhone", () => {
    const existingCustomer: Customer = {
      id: "customer-123",
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
      email: "john.doe@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
      deletedAt: null,
    };

    it("should return customer when phone found", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(existingCustomer);

      // Act
      const result = await customerService.getCustomerByPhone("+1234567890");

      // Assert
      expect(result).toEqual(existingCustomer);
      expect(mockCustomerRepository.findByPhone).toHaveBeenCalledWith(
        "+1234567890",
      );
    });

    it("should throw error when phone not found", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(null);

      // Act & Assert
      await expect(
        customerService.getCustomerByPhone("nonexistent-phone"),
      ).rejects.toThrow("Customer not found");
    });
  });

  describe("isPhoneAvailable", () => {
    it("should return true when phone is available", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(null);

      // Act
      const result = await customerService.isPhoneAvailable("+1234567890");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when phone is taken", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue({} as Customer);

      // Act
      const result = await customerService.isPhoneAvailable("+1234567890");

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when checking same customer phone", async () => {
      // Arrange
      mockCustomerRepository.findByPhone.mockResolvedValue(existingCustomer);

      // Act
      const result = await customerService.isPhoneAvailable(
        "+1234567890",
        "customer-123",
      );

      // Assert
      expect(result).toBe(true);
    });
  });
});
