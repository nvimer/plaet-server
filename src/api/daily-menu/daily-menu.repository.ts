import { getPrismaClient } from "../../database/prisma";
import {
  DailyMenuRepositoryInterface,
  DailyMenuWithRelations,
  CreateDailyMenuData,
  UpdateDailyMenuData,
} from "./interfaces/daily-menu.repository.interface";
import { DailyMenu, MenuItem, MenuCategory } from "@prisma/client";

/**
 * DailyMenu Repository Implementation - Simplified version
 * Uses manual queries to fetch related items instead of Prisma relations
 */
export class DailyMenuRepository implements DailyMenuRepositoryInterface {
  private prismaClient: ReturnType<typeof getPrismaClient>;

  constructor() {
    this.prismaClient = getPrismaClient();
  }

  /**
   * Fetch menu items by their IDs
   */
  async fetchMenuItems(
    ids: (number | null | undefined)[],
  ): Promise<MenuItem[]> {
    const validIds = ids.filter(
      (id): id is number => id !== null && id !== undefined,
    );
    if (validIds.length === 0) return [];

    return this.prismaClient.menuItem.findMany({
      where: { id: { in: validIds } },
    });
  }

  /**
   * Fetch category by ID
   */
  private async fetchCategory(
    id: number | null | undefined,
  ): Promise<MenuCategory | null> {
    if (!id) return null;
    return this.prismaClient.menuCategory.findUnique({
      where: { id },
    });
  }

  /**
   * Build DailyMenuWithRelations from raw data
   */
  private async buildWithRelations(
    menu: DailyMenu,
  ): Promise<DailyMenuWithRelations> {
    // Fetch all items and categories in parallel
    const [
      soupItems,
      principleItems,
      drinkItems,
      extraItems,
      soupCategory,
      principleCategory,
      proteinCategory,
      drinkCategory,
      extraCategory,
    ] = await Promise.all([
      this.fetchMenuItems([menu.soupOption1Id, menu.soupOption2Id]),
      this.fetchMenuItems([menu.principleOption1Id, menu.principleOption2Id]),
      this.fetchMenuItems([menu.drinkOption1Id, menu.drinkOption2Id]),
      this.fetchMenuItems([menu.extraOption1Id, menu.extraOption2Id]),
      this.fetchCategory(menu.soupCategoryId),
      this.fetchCategory(menu.principleCategoryId),
      this.fetchCategory(menu.proteinCategoryId),
      this.fetchCategory(menu.drinkCategoryId),
      this.fetchCategory(menu.extraCategoryId),
    ]);

    // Map items by their IDs for easy lookup
    const itemMap = new Map<number, MenuItem>();
    [
      ...soupItems,
      ...principleItems,
      ...drinkItems,
      ...extraItems,
    ].forEach((item) => {
      itemMap.set(item.id, item);
    });

    return {
      ...menu,
      soupCategory,
      principleCategory,
      proteinCategory,
      drinkCategory,
      extraCategory,
      soupOption1: menu.soupOption1Id
        ? itemMap.get(menu.soupOption1Id) || null
        : null,
      soupOption2: menu.soupOption2Id
        ? itemMap.get(menu.soupOption2Id) || null
        : null,
      principleOption1: menu.principleOption1Id
        ? itemMap.get(menu.principleOption1Id) || null
        : null,
      principleOption2: menu.principleOption2Id
        ? itemMap.get(menu.principleOption2Id) || null
        : null,
      drinkOption1: menu.drinkOption1Id
        ? itemMap.get(menu.drinkOption1Id) || null
        : null,
      drinkOption2: menu.drinkOption2Id
        ? itemMap.get(menu.drinkOption2Id) || null
        : null,
      extraOption1: menu.extraOption1Id
        ? itemMap.get(menu.extraOption1Id) || null
        : null,
      extraOption2: menu.extraOption2Id
        ? itemMap.get(menu.extraOption2Id) || null
        : null,
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
    });

    if (!menu) return null;

    return this.buildWithRelations(menu);
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
    });

    return this.buildWithRelations(created);
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
    });

    return this.buildWithRelations(updated);
  }
}

// Export singleton instance
export default new DailyMenuRepository();
