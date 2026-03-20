import { TicketBook, Prisma } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";

export class TicketBookRepository {
  private prisma = getPrismaClient();

  async create(data: Prisma.TicketBookCreateInput): Promise<TicketBook> {
    return await this.prisma.ticketBook.create({
      data,
    });
  }

  async findById(id: string): Promise<TicketBook | null> {
    return await this.prisma.ticketBook.findUnique({
      where: { id, deleted: false },
      include: { customer: true },
    });
  }

  async findByCustomerId(customerId: string): Promise<TicketBook[]> {
    return await this.prisma.ticketBook.findMany({
      where: { customerId, deleted: false },
      orderBy: { purchaseDate: "desc" },
    });
  }

  async update(id: string, data: Prisma.TicketBookUpdateInput): Promise<TicketBook> {
    return await this.prisma.ticketBook.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<TicketBook> {
    return await this.prisma.ticketBook.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }
}
