import { CashClosureStatus, OrderStatus } from "@prisma/client";
import prisma from "../../database/prisma";
import { OpenCashClosureDto } from "./cash-closure.validator";

export class CashClosureRepository {
  async findCurrentOpen() {
    return prisma.cashClosure.findFirst({
      where: {
        status: CashClosureStatus.OPEN,
      },
      include: {
        openedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async create(data: OpenCashClosureDto & { openedById: string }) {
    return prisma.cashClosure.create({
      data: {
        openingBalance: data.openingBalance,
        openedBy: {
          connect: { id: data.openedById },
        },
        status: CashClosureStatus.OPEN,
        openingDate: new Date(),
      },
    });
  }

  async findById(id: string) {
    return prisma.cashClosure.findUnique({
      where: { id },
      include: {
        openedBy: true,
      },
    });
  }

  async close(
    id: string,
    data: {
      actualBalance: number;
      expectedBalance: number;
      difference: number;
      closedById: string;
      closingDate: Date;
    },
  ) {
    return prisma.cashClosure.update({
      where: { id },
      data: {
        actualBalance: data.actualBalance,
        expectedBalance: data.expectedBalance,
        difference: data.difference,
        status: CashClosureStatus.CLOSED,
        closingDate: data.closingDate,
        closedBy: {
          connect: { id: data.closedById },
        },
      },
    });
  }

  async sumPaidOrdersTotalAmount(startDate: Date, endDate: Date) {
    const result = await prisma.order.aggregate({
      where: {
        status: OrderStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    return Number(result._sum.totalAmount || 0);
  }
}
