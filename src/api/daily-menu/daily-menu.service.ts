import dailyMenuRepository from "./daily-menu.repository";
import {
  DailyMenuServiceInterface,
  UpdateDailyMenuInput,
  DailyMenuResponse,
} from "./interfaces/daily-menu.service.interface";
import {
  DailyMenuRepositoryInterface,
} from "./interfaces/daily-menu.repository.interface";

/**
 * DailyMenu Service Implementation
 * Contains business logic for daily menu operations
 */
export class DailyMenuService implements DailyMenuServiceInterface {
  constructor(
    private repository: DailyMenuRepositoryInterface = dailyMenuRepository,
  ) {}

  /**
   * Get today's daily menu
   */
  async getTodayMenu(): Promise<DailyMenuResponse | null> {
    const menu = await this.repository.getCurrent();
    return menu;
  }

  /**
   * Get daily menu for a specific date
   */
  async getMenuByDate(date: Date): Promise<DailyMenuResponse | null> {
    const menu = await this.repository.findByDate(date);
    return menu;
  }

  /**
   * Update or create daily menu for today
   */
  async updateTodayMenu(data: UpdateDailyMenuInput): Promise<DailyMenuResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if menu exists for today
    const existingMenu = await this.repository.findByDate(today);

    if (existingMenu) {
      // Update existing menu
      return this.repository.updateByDate(today, {
        ...data,
        isActive: true,
      });
    } else {
      // Create new menu
      return this.repository.create({
        date: today,
        ...data,
        isActive: true,
      });
    }
  }

  /**
   * Update daily menu for a specific date
   */
  async updateMenuByDate(
    date: Date,
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Check if menu exists for the date
    const existingMenu = await this.repository.findByDate(normalizedDate);

    if (existingMenu) {
      // Update existing menu
      return this.repository.updateByDate(normalizedDate, {
        ...data,
        isActive: true,
      });
    } else {
      // Create new menu
      return this.repository.create({
        date: normalizedDate,
        ...data,
        isActive: true,
      });
    }
  }
}

// Export singleton instance
export default new DailyMenuService();
