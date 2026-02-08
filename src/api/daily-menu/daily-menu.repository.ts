import { getPrismaClient } from "../../database/prisma";
import {
  DailyMenuRepositoryInterface,
  DailyMenuWithRelations,
  CreateDailyMenuData,
  UpdateDailyMenuData,
} from "./interfaces/daily-menu.repository.interface";

/**
 * DailyMenu Repository Implementation - Updated for Item-Based Daily Menu
 * Handles all database operations for daily menu management with full item relations
 */
export class DailyMenuRepository implements DailyMenuRepositoryInterface {
  private prismaClient: ReturnType<typeof getPrismaClient>;

  constructor() {
    this.prismaClient = getPrismaClient();
  }

  /**
   * Include all relations for daily menu query
   */
  private get includeRelations() {
    return {
      soupCategory: true,
      principleCategory: true,
      proteinCategory: true,
      drinkCategory: true,
      extraCategory: true,
      soupOption1: true,
      soupOption2: true,
      principleOption1: true,
      principleOption2: true,
      proteinOption1: true,
      proteinOption2: true,
      proteinOption3: true,
      drinkOption1: true,
      drinkOption2: true,
      extraOption1: true,
      extraOption2: true,
    };
  }

  /**
   * Find daily menu by specific date with all relations
   */
  async findByDate(date: Date): Promise<DailyMenuWithRelations | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const menu = await this.prismaClient.dailyMenu.findUnique({
      where: { date: normalizedDate },
      include: this.includeRelations,
    });

    return menu as DailyMenuWithRelations | null;
  }

  /**
   * Get current daily menu (today) with all relations
   */
  async getCurrent(): Promise<DailyMenuWithRelations | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.findByDate(today);
  }

  /**
   * Create new daily menu
   */
  async create(data: CreateDailyMenuData): Promise<DailyMenuWithRelations> {
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    const created = await this.prismaClient.dailyMenu.create({
      data: {
        ...data,
        date: normalizedDate,
      },
      include: this.includeRelations,
    });

    return created as DailyMenuWithRelations;
  }

  /**
   * Update daily menu for a specific date
   */
  async updateByDate(
    date: Date,
    data: UpdateDailyMenuData,
  ): Promise<DailyMenuWithRelations> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const updated = await this.prismaClient.dailyMenu.update({
      where: { date: normalizedDate },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: this.includeRelations,
    });

    return updated as DailyMenuWithRelations;
  }
}

// Export singleton instance
export default new DailyMenuRepository();
