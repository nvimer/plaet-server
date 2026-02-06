import { PrismaClient } from "@prisma/client";
import prisma from "../../../database/prisma";
import {
  DailyMenuRepositoryInterface,
  DailyMenuWithId,
  CreateDailyMenuData,
  UpdateDailyMenuData,
} from "./interfaces/daily-menu.repository.interface";

/**
 * DailyMenu Repository Implementation
 * Handles all database operations for daily menu management
 */
export class DailyMenuRepository implements DailyMenuRepositoryInterface {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Find daily menu by specific date
   */
  async findByDate(date: Date): Promise<DailyMenuWithId | null> {
    // Normalize date to remove time component
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const menu = await this.prismaClient.dailyMenu.findUnique({
      where: {
        date: normalizedDate,
      },
    });

    return menu as DailyMenuWithId | null;
  }

  /**
   * Find or create daily menu for a specific date
   * Creates a default menu if it doesn't exist
   */
  async findOrCreateByDate(date: Date): Promise<DailyMenuWithId> {
    const existingMenu = await this.findByDate(date);

    if (existingMenu) {
      return existingMenu;
    }

    // Create default menu if not exists
    return this.create({
      date,
      side: "Not configured",
      soup: "Not configured",
      drink: "Not configured",
      isActive: true,
    });
  }

  /**
   * Get current daily menu (today)
   */
  async getCurrent(): Promise<DailyMenuWithId | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.findByDate(today);
  }

  /**
   * Update daily menu for a specific date
   */
  async updateByDate(
    date: Date,
    data: UpdateDailyMenuData,
  ): Promise<DailyMenuWithId> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const updated = await this.prismaClient.dailyMenu.update({
      where: {
        date: normalizedDate,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updated as DailyMenuWithId;
  }

  /**
   * Create new daily menu
   */
  async create(data: CreateDailyMenuData): Promise<DailyMenuWithId> {
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    const created = await this.prismaClient.dailyMenu.create({
      data: {
        ...data,
        date: normalizedDate,
      },
    });

    return created as DailyMenuWithId;
  }
}

// Export singleton instance
export default new DailyMenuRepository();
