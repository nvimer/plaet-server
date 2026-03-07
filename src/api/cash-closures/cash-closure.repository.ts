import { CashClosureStatus, PaymentMethod } from "@prisma/client";
import prisma, { getBasePrismaClient } from "../../database/prisma";
import { OpenCashClosureDto } from "./cash-closure.validator";

export class CashClosureRepository {
  /**
   * Find current open shift for the active tenant.
   * Accepts an optional restaurantId for explicit filtering when context is not reliable.
   */
  async findCurrentOpen(restaurantId?: string) {
    return prisma.cashClosure.findFirst({
      where: {
        status: CashClosureStatus.OPEN,
        ...(restaurantId && { restaurantId }),
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

  /**
   * Absolute security check: finds an open shift for a specific tenant 
   * bypassing the tenant context filter to ensure no double openings.
   */
  async findCurrentOpenForTenant(restaurantId: string) {
    return getBasePrismaClient().cashClosure.findFirst({
      where: {
        restaurantId,
        status: CashClosureStatus.OPEN,
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
      totalCash: number;
      totalNequi: number;
      totalExpenses: number;
      totalVouchers: number;
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
        totalCash: data.totalCash,
        totalNequi: data.totalNequi,
        totalExpenses: data.totalExpenses,
        totalVouchers: data.totalVouchers,
        status: CashClosureStatus.CLOSED,
        closingDate: data.closingDate,
        closedBy: {
          connect: { id: data.closedById },
        },
      },
    });
  }

  async sumPaymentsByMethod(closureId: string, method: PaymentMethod) {
    const result = await prisma.payment.aggregate({
      where: {
        cashClosureId: closureId,
        method: method,
      },
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }

  async sumExpensesByClosure(closureId: string) {
    const result = await prisma.expense.aggregate({
      where: {
        cashClosureId: closureId,
        deleted: false,
      },
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }

  async sumCashPayments(startDate: Date, endDate: Date) {
    const result = await prisma.payment.aggregate({
      where: {
        method: PaymentMethod.CASH,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }

  async sumExpenses(startDate: Date, endDate: Date) {
    const result = await prisma.expense.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deleted: false,
      },
      _sum: {
        amount: true,
      },
    });
    return Number(result._sum.amount || 0);
  }
}
