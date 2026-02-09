/**
 * DailyMenu Service Interface - Updated for Item-Based Daily Menu
 * Defines business logic operations for daily menu management with MenuItem references
 */

import { MenuCategory } from "@prisma/client";

/**
 * Menu item option with full details
 */
export interface MenuItemOption {
  id: number;
  name: string;
  price: number;
  categoryId: number;
}

/**
 * Complete daily menu configuration response
 */
export interface DailyMenuResponse {
  id: string;
  date: Date;
  isActive: boolean;
  basePrice: number;
  premiumProteinPrice: number;
  createdAt: Date;
  updatedAt: Date;

  // Categories
  soupCategory: MenuCategory | null;
  principleCategory: MenuCategory | null;
  proteinCategory: MenuCategory | null;
  drinkCategory: MenuCategory | null;
  extraCategory: MenuCategory | null;

  // Item options
  soupOptions: MenuItemOption[];
  principleOptions: MenuItemOption[];
  proteinOptions: MenuItemOption[];
  drinkOptions: MenuItemOption[];
  extraOptions: MenuItemOption[];
}

/**
 * Input for configuring item options
 */
export interface DailyMenuItemOptionInput {
  option1Id?: number | null;
  option2Id?: number | null;
  option3Id?: number | null;
}

/**
 * Input data for creating/updating a daily menu
 */
export interface UpdateDailyMenuInput {
  // Prices
  basePrice?: number;
  premiumProteinPrice?: number;

  // Category IDs
  soupCategoryId?: number | null;
  principleCategoryId?: number | null;
  proteinCategoryId?: number | null;
  drinkCategoryId?: number | null;
  extraCategoryId?: number | null;

  // Item options
  soupOptions?: DailyMenuItemOptionInput;
  principleOptions?: DailyMenuItemOptionInput;
  proteinOptions?: DailyMenuItemOptionInput;
  drinkOptions?: DailyMenuItemOptionInput;
  extraOptions?: DailyMenuItemOptionInput;
}

/**
 * DailyMenu Service Interface
 * Contract for business logic layer
 */
export interface DailyMenuServiceInterface {
  /**
   * Get today's daily menu with full item details
   * @returns Today's menu or null if not configured
   */
  getTodayMenu(): Promise<DailyMenuResponse | null>;

  /**
   * Get daily menu for a specific date with full item details
   * @param date - Date to retrieve menu for
   * @returns Menu for the specified date or null
   */
  getMenuByDate(date: Date): Promise<DailyMenuResponse | null>;

  /**
   * Update or create daily menu for today
   * @param data - Menu configuration data
   * @returns Updated or created menu
   */
  updateTodayMenu(data: UpdateDailyMenuInput): Promise<DailyMenuResponse>;

  /**
   * Update daily menu for a specific date
   * @param date - Date to update
   * @param data - Menu configuration data
   * @returns Updated menu
   */
  updateMenuByDate(
    date: Date,
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse>;
}
