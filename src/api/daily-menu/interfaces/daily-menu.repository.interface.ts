/**
 * DailyMenu Repository Interface
 * Defines the contract for daily menu data access operations
 */

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
 * DailyMenu Repository Interface
 * Contract for data access layer
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
