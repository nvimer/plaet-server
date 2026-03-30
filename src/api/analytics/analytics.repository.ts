import { OrderStatus, Order, Payment, OrderItem, MenuItem, MenuCategory } from "@prisma/client";
import prisma from "../../database/prisma";

export class AnalyticsRepository {
  async getOrdersByDateRange(startDate: Date, endDate: Date) {
    return prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });
  }

  async getItemsForEngineering(startDate: Date, endDate: Date) {
    return prisma.orderItem.findMany({
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
  }

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
      (sum: number, order: Order) => sum + Number(order.totalAmount),
      0,
    );
    const orderCount = orders.length;

    const breakdown: Record<string, number> = {
      CASH: 0,
      NEQUI: 0,
      TICKET_BOOK: 0,
    };

    orders.forEach((order: Order & { payments: Payment[] }) => {
      order.payments.forEach((payment: Payment) => {
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

  async getTopProducts(startDate: Date, endDate: Date, limit: number = 10) {
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
      string,
      { id: number | string; name: string; quantity: number; totalRevenue: number }
    > = {};

    orderItems.forEach((item: OrderItem & { menuItem: MenuItem | null }) => {
      // Use menuItem ID or a synthetic ID based on notes for manual items
      const itemKey = item.menuItemId ? `menu-${item.menuItemId}` : `manual-${item.notes || "Otro"}`;
      const itemName = item.menuItem?.name || item.notes || "Producto Manual";

      if (!productStats[itemKey]) {
        productStats[itemKey] = {
          id: item.menuItemId || itemKey,
          name: itemName,
          quantity: 0,
          totalRevenue: 0,
        };
      }

      productStats[itemKey].quantity += item.quantity;
      productStats[itemKey].totalRevenue +=
        Number(item.priceAtOrder) * item.quantity;
    });

    return Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  /**
   * Specifically counts packaging items (Portacomidas) based on keywords in notes
   */
  async getPackagingCount(startDate: Date, endDate: Date) {
    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.PAID,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        OR: [
          { notes: { contains: "Portacomida", mode: "insensitive" } },
          { notes: { contains: "Empaque", mode: "insensitive" } }
        ]
      },
      select: {
        quantity: true
      }
    });

    return items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
  }

  async getSalesByCategory(startDate: Date, endDate: Date) {
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
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoryStats: Record<string, number> = {};

    orderItems.forEach((item: OrderItem & { menuItem: (MenuItem & { category: MenuCategory }) | null }) => {
      const categoryName = item.menuItem?.category?.name || "Otros";
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0;
      }
      categoryStats[categoryName] += Number(item.priceAtOrder) * item.quantity;
    });

    return Object.entries(categoryStats).map(([name, total]) => ({
      name,
      total,
    }));
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

  /**
   * Gets a breakdown of proteins sold (items in 'Proteínas' category)
   */
  async getProteinBreakdown(startDate: Date, endDate: Date) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.PAID,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        menuItem: {
          category: {
            name: "Proteínas",
          },
        },
      },
      include: {
        menuItem: true,
      },
    });

    const proteinStats: Record<string, number> = {};

    orderItems.forEach((item: OrderItem & { menuItem: MenuItem | null }) => {
      const proteinName = item.menuItem?.name || "Proteína Desconocida";
      if (!proteinStats[proteinName]) {
        proteinStats[proteinName] = 0;
      }
      proteinStats[proteinName] += item.quantity;
    });

    return Object.entries(proteinStats).map(([name, quantity]) => ({
      name,
      quantity,
    }));
  }

  /**
   * Counts the total portions used from Ticket Books
   */
  async getPortionUsageCount(startDate: Date, endDate: Date) {
    const usages = await prisma.ticketBookUsage.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        portionCount: true,
      },
    });

    return usages._sum.portionCount || 0;
  }
}

