import { CashClosureStatus, OrderType, PaymentMethod } from "@prisma/client";
import prisma, { getBasePrismaClient } from "../../database/prisma";
import { tenantContext } from "../../utils/tenant-context";
import { OpenCashClosureDto } from "./cash-closure.validator";

export class CashClosureRepository {
  /**
   * Find current open shift for a tenant.
   * If restaurantId is provided, it uses the base client for maximum reliability in production.
   * If not, it falls back to the tenant context and the extended client.
   */
  async findCurrentOpen(restaurantId?: string) {
    if (restaurantId) {
      return getBasePrismaClient().cashClosure.findFirst({
        where: {
          restaurantId,
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

    const context = tenantContext.getStore();
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

  /**
   * Finds a cash closure that was active on a specific date.
   * Useful for historical order association.
   */
  async findActiveOnDate(date: Date, restaurantId?: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      openingDate: {
        gte: start,
        lte: end,
      },
    };

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    // Try to find an open one first (if looking for today), otherwise any closure on that day
    return prisma.cashClosure.findFirst({
      where,
      orderBy: { openingDate: "desc" },
    });
  }

  async create(
    data: OpenCashClosureDto & { openedById: string; restaurantId: string },
  ) {
    return prisma.cashClosure.create({
      data: {
        openingBalance: data.openingBalance,
        restaurantId: data.restaurantId,
        openedById: data.openedById,
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
      totalDelivery?: number;
      deliveryCash?: number;
      deliveryNequi?: number;
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
        totalDelivery: data.totalDelivery || 0,
        deliveryCash: data.deliveryCash || 0,
        deliveryNequi: data.deliveryNequi || 0,
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

  async sumDeliveryPaymentsByMethod(closureId: string) {
    const orders = await prisma.order.findMany({
      where: {
        cashClosureId: closureId,
        type: OrderType.DELIVERY,
      },
      include: {
        payments: true,
      },
    });

    let deliveryCash = 0;
    let deliveryNequi = 0;

    for (const order of orders) {
      for (const payment of order.payments) {
        if (payment.method === PaymentMethod.CASH) {
          deliveryCash += Number(payment.amount);
        } else if (payment.method === PaymentMethod.NEQUI) {
          deliveryNequi += Number(payment.amount);
        }
      }
    }

    return {
      totalDelivery: deliveryCash + deliveryNequi,
      deliveryCash,
      deliveryNequi,
    };
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
