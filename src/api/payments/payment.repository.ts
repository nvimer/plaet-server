import { Payment, Prisma } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { IPaymentRepository } from "./interfaces/payment.repository.interface";
import { PrismaTransaction } from "../../types/prisma-transaction.types";

export class PaymentRepository implements IPaymentRepository {
  private prisma = getPrismaClient();

  async create(
    data: Prisma.PaymentUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<Payment> {
    const client = tx || this.prisma;
    return await client.payment.create({
      data,
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return await this.prisma.payment.findUnique({
      where: { id },
    });
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new PaymentRepository();
