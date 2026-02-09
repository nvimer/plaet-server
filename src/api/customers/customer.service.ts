import { Customer, Prisma } from "@prisma/client";
import { CustomerRepository } from "./customer.repository";
import {
  ICustomerService,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerSearchParams,
  PaginationResult,
} from "./interfaces/customer.service.interface";
import { CustomError } from "../../types/custom-errors";

/**
 * Customer service implementation
 * Contains all business logic for customer management
 */
export class CustomerService implements ICustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  /**
   * Create a new customer with validation
   * @param data - Customer creation data
   * @returns Created customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    // Validate phone uniqueness
    const phoneAvailable = await this.isPhoneAvailable(data.phone);
    if (!phoneAvailable) {
      throw new CustomError("Phone number already exists", 409);
    }

    // Validate email uniqueness if provided
    if (data.email) {
      const emailAvailable = await this.isEmailAvailable(data.email);
      if (!emailAvailable) {
        throw new CustomError("Email already exists", 409);
      }
    }

    // Create customer
    return await this.customerRepository.create({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
    });
  }

  /**
   * Get customer by ID
   * @param id - Customer UUID
   * @returns Customer or null if not found
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new CustomError("Customer not found", 404);
    }

    return customer;
  }

  /**
   * Get customer by phone number
   * @param phone - Customer phone
   * @returns Customer or null if not found
   */
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findByPhone(phone);

    if (!customer) {
      throw new CustomError("Customer not found", 404);
    }

    return customer;
  }

  /**
   * Search customers with text query
   * @param params - Search parameters
   * @returns Paginated search results
   */
  async searchCustomers(
    params: CustomerSearchParams,
  ): Promise<PaginationResult<Customer>> {
    const {
      query,
      page = 1,
      limit = 10,
      sortBy = "firstName",
      sortOrder = "asc",
    } = params;

    const skip = (page - 1) * limit;

    let where = {};
    if (query) {
      where = {
        OR: [
          {
            firstName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: query,
            },
          },
        ],
      };
    }

    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.customerRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy,
      }),
      this.customerRepository.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * List customers with pagination
   * @param params - List parameters
   * @returns Paginated customer list
   */
  async listCustomers(
    params: CustomerSearchParams,
  ): Promise<PaginationResult<Customer>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "firstName",
      sortOrder = "asc",
    } = params;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.customerRepository.findMany({
        skip,
        take: limit,
        orderBy,
      }),
      this.customerRepository.count({}),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update customer information
   * @param id - Customer UUID
   * @param data - Update data
   * @returns Updated customer
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new CustomError("Customer not found", 404);
    }

    // Validate phone uniqueness if being updated
    if (data.phone && data.phone !== existingCustomer.phone) {
      const phoneAvailable = await this.isPhoneAvailable(data.phone, id);
      if (!phoneAvailable) {
        throw new CustomError("Phone number already exists", 409);
      }
    }

    // Validate email uniqueness if being updated
    if (data.email && data.email !== existingCustomer.email) {
      if (data.email) {
        const emailAvailable = await this.isEmailAvailable(data.email, id);
        if (!emailAvailable) {
          throw new CustomError("Email already exists", 409);
        }
      }
    }

    // Prepare update data
    const updateData: Prisma.CustomerUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone.trim();
    }

    if (data.email !== undefined) {
      updateData.email = data.email?.trim() || null;
    }

    return await this.customerRepository.update(id, updateData);
  }

  /**
   * Soft delete customer
   * @param id - Customer UUID
   * @returns Deleted customer
   */
  async deleteCustomer(id: string): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new CustomError("Customer not found", 404);
    }

    // Check if customer has active orders
    // Note: Add this check if you want to prevent deletion of customers with active orders
    // const activeOrders = await this.checkForActiveOrders(id);
    // if (activeOrders) {
    //   throw new CustomError('Cannot delete customer with active orders', 400);
    // }

    return await this.customerRepository.softDelete(id);
  }

  /**
   * Check if phone number is available
   * @param phone - Phone number to check
   * @param excludeId - Optional customer ID to exclude from check
   * @returns True if available, false if taken
   */
  async isPhoneAvailable(phone: string, excludeId?: string): Promise<boolean> {
    const existingCustomer = await this.customerRepository.findByPhone(phone);

    if (!existingCustomer) {
      return true;
    }

    // If excluding ID, check if the existing customer is the same one
    if (excludeId && existingCustomer.id === excludeId) {
      return true;
    }

    return false;
  }

  /**
   * Check if email is available
   * @param email - Email to check
   * @param excludeId - Optional customer ID to exclude from check
   * @returns True if available, false if taken
   */
  async isEmailAvailable(email: string, excludeId?: string): Promise<boolean> {
    const existingCustomer = await this.customerRepository.findByEmail(email);

    if (!existingCustomer) {
      return true;
    }

    // If excluding ID, check if the existing customer is the same one
    if (excludeId && existingCustomer.id === excludeId) {
      return true;
    }

    return false;
  }
}
