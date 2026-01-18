import { Customer, Prisma } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { ICustomerRepository } from "./interfaces/customer.repository.interface";

/**
 * Customer repository implementation
 * Handles all database operations for customers
 */
export class CustomerRepository implements ICustomerRepository {
  private prisma = getPrismaClient();

  /**
   * Create a new customer in the database
   * @param data - Customer creation data
   * @returns Created customer record
   */
  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return await this.prisma.customer.create({
      data,
      include: {
        orders: false, // Don't include related data by default
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Find customer by ID
   * @param id - Customer UUID
   * @returns Customer record or null if not found
   */
  async findById(id: string): Promise<Customer | null> {
    return await this.prisma.customer.findUnique({
      where: {
        id,
        deleted: false, // Only return non-deleted customers
      },
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Find customer by email
   * @param email - Customer email
   * @returns Customer record or null if not found
   */
  async findByEmail(email: string): Promise<Customer | null> {
    if (!email) return null;

    return await this.prisma.customer.findFirst({
      where: {
        email,
        deleted: false,
      },
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Find customer by phone number
   * @param phone - Customer phone number
   * @returns Customer record or null if not found
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return await this.prisma.customer.findUnique({
      where: {
        phone,
        deleted: false,
      },
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Find multiple customers with filtering and pagination
   * @param params - Query parameters
   * @returns Array of customer records
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput;
  }): Promise<Customer[]> {
    const { skip, take, where, orderBy } = params;

    return await this.prisma.customer.findMany({
      skip,
      take,
      where: {
        ...where,
        deleted: false, // Always exclude deleted records
      },
      orderBy,
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Count customers with filtering
   * @param params - Count parameters
   * @returns Total count of matching customers
   */
  async count(params: { where?: Prisma.CustomerWhereInput }): Promise<number> {
    const { where } = params;

    return await this.prisma.customer.count({
      where: {
        ...where,
        deleted: false,
      },
    });
  }

  /**
   * Update customer information
   * @param id - Customer UUID
   * @param data - Update data
   * @returns Updated customer record
   */
  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    return await this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete customer (mark as deleted)
   * @param id - Customer UUID
   * @returns Updated customer record
   */
  async softDelete(id: string): Promise<Customer> {
    return await this.prisma.customer.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Search customers by name or phone number
   * @param query - Search query string
   * @returns Array of matching customer records
   */
  async searchByNameOrPhone(query: string): Promise<Customer[]> {
    return await this.prisma.customer.findMany({
      where: {
        deleted: false,
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
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 20, // Limit search results
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  /**
   * Get all active (non-deleted) customers
   * @returns Array of active customer records
   */
  async findActiveCustomers(): Promise<Customer[]> {
    return await this.prisma.customer.findMany({
      where: {
        deleted: false,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }
}
