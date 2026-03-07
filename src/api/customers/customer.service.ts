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

export class CustomerService implements ICustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const phoneAvailable = await this.isPhoneAvailable(data.phone);
    if (!phoneAvailable)
      throw new CustomError("Phone number already exists", 409);
    if (data.email) {
      const emailAvailable = await this.isEmailAvailable(data.email);
      if (!emailAvailable) throw new CustomError("Email already exists", 409);
    }
    return await this.customerRepository.create({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      phone2: data.phone2?.trim() || null,
      address1: data.address1?.trim() || null,
      address2: data.address2?.trim() || null,
      email: data.email?.trim() || null,
    });
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw new CustomError("Customer not found", 404);
    return customer;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findByPhone(phone);
    if (!customer) throw new CustomError("Customer not found", 404);
    return customer;
  }

  async findByPhoneWithActiveTickets(phone: string): Promise<any | null> {
    return await this.customerRepository.findByPhoneWithActiveTickets(phone);
  }

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
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { phone2: { contains: query } },
        ],
      };
    }
    const orderBy = { [sortBy]: sortOrder };
    const [data, total] = await Promise.all([
      this.customerRepository.findMany({ skip, take: limit, where, orderBy }),
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
      this.customerRepository.findMany({ skip, take: limit, orderBy }),
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

  async updateCustomer(
    id: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) throw new CustomError("Customer not found", 404);
    if (data.phone && data.phone !== existingCustomer.phone) {
      const phoneAvailable = await this.isPhoneAvailable(data.phone, id);
      if (!phoneAvailable)
        throw new CustomError("Phone number already exists", 409);
    }
    const updateData: Prisma.CustomerUpdateInput = {};
    if (data.firstName !== undefined)
      updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.phone2 !== undefined) updateData.phone2 = data.phone2?.trim() || null;
    if (data.address1 !== undefined) updateData.address1 = data.address1?.trim() || null;
    if (data.address2 !== undefined) updateData.address2 = data.address2?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    return await this.customerRepository.update(id, updateData);
  }

  async deleteCustomer(id: string): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) throw new CustomError("Customer not found", 404);
    return await this.customerRepository.softDelete(id);
  }

  async isPhoneAvailable(phone: string, excludeId?: string): Promise<boolean> {
    const existingCustomer = await this.customerRepository.findByPhone(phone);
    if (!existingCustomer) return true;
    if (excludeId && existingCustomer.id === excludeId) return true;
    return false;
  }

  async isEmailAvailable(email: string, excludeId?: string): Promise<boolean> {
    const existingCustomer = await this.customerRepository.findByEmail(email);
    if (!existingCustomer) return true;
    if (excludeId && existingCustomer.id === excludeId) return true;
    return false;
  }
}
