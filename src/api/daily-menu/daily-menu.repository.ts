import { PrismaClient } from "@prisma/client";
import prisma from "../../../database/prisma";

/**
 * DailyMenu Repository Interface
 * Defines the contract for daily menu data access operations
 */
export interface DailyMenuRepositoryInterface {
  /**
   * Find daily menu by specific date
   * @param date - Date to search for
   * @returns Daily menu or null if not found
   */
  findByDate(date: Date): Promise<DailyMenuWithId | null>;

  /**
   * Find or create daily menu for a specific date
   * If menu doesn't exist, creates a default one
   * @param date - Date to find or create
   * @returns Existing or newly created daily menu
   */
  findOrCreateByDate(date: Date): Promise<DailyMenuWithId>;

  /**
   * Get current daily menu (today)
   * @returns Today's menu or null
   */
  getCurrent(): Promise<DailyMenuWithId | null>;

  /**
   * Update daily menu for a specific date
   * @param date - Date to update
   * @param data - Menu data to update
   * @returns Updated daily menu
   */
  updateByDate(date: Date, data: UpdateDailyMenuData): Promise<DailyMenuWithId>;

  /**
   * Create new daily menu
   * @param data - Menu data to create
   * @returns Created daily menu
   */
  create(data: CreateDailyMenuData): Promise<DailyMenuWithId>;
}

/**
 * DailyMenu data structure with ID
 */
export interface DailyMenuWithId {
  id: string;
  date: Date;
  side: string;
  soup: string;
  drink: string;
  dessert: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a daily menu
 */
export interface CreateDailyMenuData {
  date: Date;
  side: string;
  soup: string;
  drink: string;
  dessert?: string;
  isActive?: boolean;
}

/**
 * Data for updating a daily menu
 */
export interface UpdateDailyMenuData {
  side?: string;
  soup?: string;
  drink?: string;
  dessert?: string | null;
  isActive?: boolean;
}

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
