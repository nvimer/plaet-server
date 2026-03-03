import { Payment, Prisma } from "@prisma/client";
import { PrismaTransaction } from "../../../types/prisma-transaction.types";

export interface IPaymentRepository {
  create(
    data: Prisma.PaymentUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
}
