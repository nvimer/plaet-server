/**
 * DailyMenu Service Interface
 * Defines business logic operations for daily menu management
 */

/**
 * Input data for updating a daily menu
 */
export interface UpdateDailyMenuInput {
  side: string;
  soup: string;
  drink: string;
  dessert?: string;
}

/**
 * Response structure for daily menu
 */
export interface DailyMenuResponse {
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
 * DailyMenu Service Interface
 * Contract for business logic layer
 */
export interface DailyMenuServiceInterface {
  /**
   * Get today's daily menu
   * @returns Today's menu or null if not configured
   */
  getTodayMenu(): Promise<DailyMenuResponse | null>;

  /**
   * Get daily menu for a specific date
   * @param date - Date to retrieve menu for
   * @returns Menu for the specified date or null
   */
  getMenuByDate(date: Date): Promise<DailyMenuResponse | null>;

  /**
   * Update or create daily menu for today
   * @param data - Menu data to update
   * @returns Updated or created menu
   */
  updateTodayMenu(data: UpdateDailyMenuInput): Promise<DailyMenuResponse>;

  /**
   * Update daily menu for a specific date
   * @param date - Date to update
   * @param data - Menu data to update
   * @returns Updated menu
   */
  updateMenuByDate(
    date: Date,
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse>;
}
