import { OrderStatus } from "@prisma/client";
import prisma from "../../database/prisma";

export class AnalyticsRepository {
  async getSalesSummary(startDate: Date, endDate: Date) {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payments: true,
      },
    });

    const totalSold = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );
    const orderCount = orders.length;

    const breakdown: Record<string, number> = {
      CASH: 0,
      NEQUI: 0,
      TICKET_BOOK: 0,
    };

    orders.forEach((order) => {
      order.payments.forEach((payment) => {
        if (payment.method in breakdown) {
          breakdown[payment.method] += Number(payment.amount);
        }
      });
    });

    return {
      totalSold,
      orderCount,
      breakdown,
    };
  }

  async getTopProducts(startDate: Date, endDate: Date, limit: number = 5) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.PAID,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        menuItem: true,
      },
    });

    const productStats: Record<
      number,
      { id: number; name: string; quantity: number; totalRevenue: number }
    > = {};

    orderItems.forEach((item) => {
      if (!item.menuItemId) return;

      if (!productStats[item.menuItemId]) {
        productStats[item.menuItemId] = {
          id: item.menuItemId,
          name: item.menuItem?.name || "Unknown Product",
          quantity: 0,
          totalRevenue: 0,
        };
      }

      productStats[item.menuItemId].quantity += item.quantity;
      productStats[item.menuItemId].totalRevenue +=
        Number(item.priceAtOrder) * item.quantity;
    });

    return Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  async getTotalExpenses(startDate: Date, endDate: Date) {
    const expenses = await prisma.expense.aggregate({
      where: {
        deleted: false,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(expenses._sum.amount || 0);
  }
}
