import { Customer, Prisma, TicketBook } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { ICustomerRepository } from "./interfaces/customer.repository.interface";

export class CustomerRepository implements ICustomerRepository {
  private prisma = getPrismaClient();

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return await this.prisma.customer.create({
      data,
      include: {
        orders: false,
        ticketBooks: false,
        dailyCodes: false,
      },
    });
  }

  async findById(id: string): Promise<Customer | null> {
    return await this.prisma.customer.findUnique({
      where: { id, deleted: false },
      include: { 
        orders: { 
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { items: { include: { menuItem: true } } }
        }, 
        ticketBooks: {
          orderBy: { createdAt: "desc" }
        } 
      },
    });
  }

  async findByEmail(email: string): Promise<Customer | null> {
    if (!email) return null;
    return await this.prisma.customer.findFirst({
      where: { email, deleted: false },
      include: { orders: false, ticketBooks: false, dailyCodes: false },
    });
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return await this.prisma.customer.findFirst({
      where: {
        deleted: false,
        OR: [{ phone: phone }, { phone2: phone }],
      },
      include: { orders: false, ticketBooks: false, dailyCodes: false },
    });
  }

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
      where: { ...where, deleted: false },
      orderBy,
      include: { 
        _count: {
          select: { 
            ticketBooks: { where: { status: "active" } },
            orders: true 
          }
        }
      },
    });
  }

  async count(params: { where?: Prisma.CustomerWhereInput }): Promise<number> {
    return await this.prisma.customer.count({
      where: { ...params.where, deleted: false },
    });
  }

  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    return await this.prisma.customer.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: string): Promise<Customer> {
    return await this.prisma.customer.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  async searchByNameOrPhone(query: string): Promise<Customer[]> {
    return await this.prisma.customer.findMany({
      where: {
        deleted: false,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { phone2: { contains: query } },
        ],
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 20,
      include: { orders: false, ticketBooks: false, dailyCodes: false },
    });
  }

  async findByPhoneWithActiveTickets(
    phone: string,
  ): Promise<(Customer & { ticketBooks: TicketBook[] }) | null> {
    return await this.prisma.customer.findFirst({
      where: {
        deleted: false,
        OR: [{ phone: phone }, { phone2: phone }],
      },
      include: { ticketBooks: { where: { status: "active" } } },
    });
  }

  async findActiveCustomers(): Promise<Customer[]> {
    return await this.prisma.customer.findMany({
      where: { deleted: false },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: { orders: false, ticketBooks: false, dailyCodes: false },
    });
  }
}
