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
    const totalExpenses = await this.repository.getTotalExpenses(
      startDate,
      endDate,
    );

    const netBalance = salesSummary.totalSold - totalExpenses;

    return {
      salesSummary: {
        totalSold: salesSummary.totalSold,
        orderCount: salesSummary.orderCount,
        breakdown: salesSummary.breakdown,
      },
      topProducts,
      netBalance,
    };
  }
}
