import { Customer, Prisma } from "@prisma/client";

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface CustomerSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: "firstName" | "lastName" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Interface for customer service operations
 * Defines contract for customer business logic
 */
export interface ICustomerService {
  // Customer lifecycle
  createCustomer(data: CreateCustomerData): Promise<Customer>;
  getCustomerById(id: string): Promise<Customer | null>;
  getCustomerByPhone(phone: string): Promise<Customer | null>;

  // Search and listing
  searchCustomers(
    params: CustomerSearchParams,
  ): Promise<PaginationResult<Customer>>;
  listCustomers(
    params: CustomerSearchParams,
  ): Promise<PaginationResult<Customer>>;

  // Update operations
  updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer>;

  // Delete operations
  deleteCustomer(id: string): Promise<Customer>;

  // Business logic
  isPhoneAvailable(phone: string, excludeId?: string): Promise<boolean>;
  isEmailAvailable(email: string, excludeId?: string): Promise<boolean>;
}
