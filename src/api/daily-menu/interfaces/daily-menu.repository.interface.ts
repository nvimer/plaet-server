/**
 * DailyMenu Repository Interface - Updated for simplified schema
 * Defines database operations for daily menu management
 */

import { DailyMenu, MenuCategory, MenuItem } from "@prisma/client";

/**
 * DailyMenu with all item relations populated
 */
export type DailyMenuWithRelations = DailyMenu & {
  soupCategory: MenuCategory | null;
  principleCategory: MenuCategory | null;
  proteinCategory: MenuCategory | null;
  drinkCategory: MenuCategory | null;
  extraCategory: MenuCategory | null;
  soupOption1: MenuItem | null;
  soupOption2: MenuItem | null;
  principleOption1: MenuItem | null;
  principleOption2: MenuItem | null;
  // Protein options are now loaded separately from proteinIds array
  proteinIds: number[];
  drinkOption1: MenuItem | null;
  drinkOption2: MenuItem | null;
  extraOption1: MenuItem | null;
  extraOption2: MenuItem | null;
};

/**
 * Data for creating a daily menu
 */
export interface CreateDailyMenuData {
  date: Date;
  isActive?: boolean;
  basePrice?: number;
  premiumProteinPrice?: number;
  soupCategoryId?: number | null;
  principleCategoryId?: number | null;
  proteinCategoryId?: number | null;
  drinkCategoryId?: number | null;
  extraCategoryId?: number | null;
  soupOption1Id?: number | null;
  soupOption2Id?: number | null;
  principleOption1Id?: number | null;
  principleOption2Id?: number | null;
  drinkOption1Id?: number | null;
  drinkOption2Id?: number | null;
  extraOption1Id?: number | null;
  extraOption2Id?: number | null;
  proteinIds?: number[];
}

/**
 * Data for updating a daily menu
 */
export interface UpdateDailyMenuData {
  basePrice?: number;
  premiumProteinPrice?: number;
  soupCategoryId?: number | null;
  principleCategoryId?: number | null;
  proteinCategoryId?: number | null;
  drinkCategoryId?: number | null;
  extraCategoryId?: number | null;
  soupOption1Id?: number | null;
  soupOption2Id?: number | null;
  principleOption1Id?: number | null;
  principleOption2Id?: number | null;
  drinkOption1Id?: number | null;
  drinkOption2Id?: number | null;
  extraOption1Id?: number | null;
  extraOption2Id?: number | null;
  proteinIds?: number[];
  isActive?: boolean;
}

/**
 * DailyMenu Repository Interface
 * Contract for data access layer
 */
export interface DailyMenuRepositoryInterface {
  /**
   * Find daily menu by specific date with all relations
   */
  findByDate(date: Date): Promise<DailyMenuWithRelations | null>;

  /**
   * Get current daily menu (today) with all relations
   */
  getCurrent(): Promise<DailyMenuWithRelations | null>;

  /**
   * Create new daily menu
   */
  create(data: CreateDailyMenuData): Promise<DailyMenuWithRelations>;

  /**
   * Update daily menu for a specific date
   */
  updateByDate(
    date: Date,
    data: UpdateDailyMenuData,
  ): Promise<DailyMenuWithRelations>;

  /**
   * Fetch menu items by their IDs
   */
  fetchMenuItems(ids: (number | null | undefined)[]): Promise<import("@prisma/client").MenuItem[]>;
}
