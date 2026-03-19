import moment from "moment";
import { AnalyticsRepository } from "./analytics.repository";

export class AnalyticsService {
  private repository: AnalyticsRepository;

  constructor() {
    this.repository = new AnalyticsRepository();
  }

  async getDailySummary(dateStr?: string) {
    const date = dateStr ? moment(dateStr, "YYYY-MM-DD") : moment();
    const startDate = date.startOf("day").toDate();
    const endDate = date.endOf("day").toDate();

    const salesSummary = await this.repository.getSalesSummary(
      startDate,
      endDate,
    );
    const topProducts = await this.repository.getTopProducts(
      startDate,
      endDate,
    );
    const salesByCategory = await this.repository.getSalesByCategory(
      startDate,
      endDate,
    );
    const totalExpenses = await this.repository.getTotalExpenses(
      startDate,
      endDate,
    );
    const packagingCount = await this.repository.getPackagingCount(
      startDate,
      endDate,
    );

    const netBalance = salesSummary.totalSold - totalExpenses;

    return {
      salesSummary: {
        totalSold: salesSummary.totalSold,
        orderCount: salesSummary.orderCount,
        packagingCount,
        byPaymentMethod: salesSummary.breakdown,
        byCategory: salesByCategory,
      },
      topProducts,
      totalExpenses,
      netBalance,
    };
  }

  async getMenuEngineering(startDateStr: string, endDateStr: string) {
    const startDate = moment(startDateStr).startOf("day").toDate();
    const endDate = moment(endDateStr).endOf("day").toDate();

    const items = await this.repository.getItemsForEngineering(
      startDate,
      endDate,
    );

    // Group by menuItem
    const stats: Record<
      number,
      { name: string; quantity: number; revenue: number }
    > = {};
    let totalQuantity = 0;
    let totalRevenue = 0;

    items.forEach((item) => {
      if (!item.menuItemId) return;
      if (!stats[item.menuItemId]) {
        stats[item.menuItemId] = {
          name: item.menuItem?.name || "Unknown",
          quantity: 0,
          revenue: 0,
        };
      }
      stats[item.menuItemId].quantity += item.quantity;
      const rev = Number(item.priceAtOrder) * item.quantity;
      stats[item.menuItemId].revenue += rev;

      totalQuantity += item.quantity;
      totalRevenue += rev;
    });

    const itemsList = Object.values(stats);
    if (itemsList.length === 0) return [];

    const avgQuantity = totalQuantity / itemsList.length;
    const avgRevenue = totalRevenue / itemsList.length; // using Revenue as proxy for Profitability

    return itemsList.map((item) => {
      let category = "Dog";
      if (item.quantity >= avgQuantity && item.revenue >= avgRevenue)
        category = "Star";
      else if (item.quantity >= avgQuantity && item.revenue < avgRevenue)
        category = "Plowhorse";
      else if (item.quantity < avgQuantity && item.revenue >= avgRevenue)
        category = "Puzzle";

      return { ...item, category };
    });
  }

  async getSalesPrediction(targetDateStr: string) {
    const targetDate = moment(targetDateStr, "YYYY-MM-DD");
    const targetWeekday = targetDate.day();

    // Get last 4 matching weekdays
    const predictions = [];
    let totalSales = 0;
    let weightSum = 0;

    for (let i = 1; i <= 4; i++) {
      const pastDate = targetDate.clone().subtract(i, "weeks");
      const start = pastDate.startOf("day").toDate();
      const end = pastDate.endOf("day").toDate();

      const sales = await this.repository.getSalesSummary(start, end);
      const weight = 5 - i; // Recent weeks have higher weight (4, 3, 2, 1)

      predictions.push({
        date: pastDate.format("YYYY-MM-DD"),
        sales: sales.totalSold,
        weight,
      });
      totalSales += sales.totalSold * weight;
      weightSum += weight;
    }

    const predictedSales = weightSum > 0 ? totalSales / weightSum : 0;

    return {
      targetDate: targetDate.format("YYYY-MM-DD"),
      predictedSales,
      historicalData: predictions,
    };
  }

  async getHeatmap(startDateStr: string, endDateStr: string) {
    const startDate = moment(startDateStr).startOf("day").toDate();
    const endDate = moment(endDateStr).endOf("day").toDate();

    const orders = await this.repository.getOrdersByDateRange(
      startDate,
      endDate,
    );

    // Group by hour (0-23)
    const hourlyStats = Array(24)
      .fill(0)
      .map((_, hour) => ({ hour, count: 0, revenue: 0 }));

    orders.forEach((order) => {
      const hour = moment(order.createdAt).hour();
      hourlyStats[hour].count += 1;
      hourlyStats[hour].revenue += Number(order.totalAmount);
    });

    return hourlyStats;
  }
}
