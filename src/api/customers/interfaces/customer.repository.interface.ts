import { Customer, Prisma } from "@prisma/client";

/**
 * Interface for customer repository operations
 * Defines contract for customer data access methods
 */
export interface ICustomerRepository {
  // Basic CRUD operations
  create(data: Prisma.CustomerCreateInput): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findByPhone(phone: string): Promise<Customer | null>;

  // Search and filtering
  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput;
  }): Promise<Customer[]>;

  count(params: { where?: Prisma.CustomerWhereInput }): Promise<number>;

  // Update operations
  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer>;
  softDelete(id: string): Promise<Customer>;

  // Business specific methods
  searchByNameOrPhone(query: string): Promise<Customer[]>;
  findActiveCustomers(): Promise<Customer[]>;
}
