import dailyMenuRepository from "./daily-menu.repository";
import {
  DailyMenuServiceInterface,
  UpdateDailyMenuInput,
  DailyMenuResponse,
  MenuItemOption,
} from "./interfaces/daily-menu.service.interface";
import {
  DailyMenuRepositoryInterface,
  DailyMenuWithRelations,
} from "./interfaces/daily-menu.repository.interface";
import { MenuItem } from "@prisma/client";

/**
 * DailyMenu Service Implementation - Updated for Item-Based Daily Menu
 * Contains business logic for daily menu operations with MenuItem references
 */
export class DailyMenuService implements DailyMenuServiceInterface {
  constructor(
    private repository: DailyMenuRepositoryInterface = dailyMenuRepository,
  ) {}

  /**
   * Transform MenuItem to MenuItemOption
   */
  private toMenuItemOption(item: MenuItem | null): MenuItemOption | null {
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      price: Number(item.price),
      categoryId: item.categoryId,
    };
  }

  /**
   * Transform database model to API response
   */
  private async toResponse(
    menu: DailyMenuWithRelations,
  ): Promise<DailyMenuResponse> {
    // Fetch protein items from proteinIds array
    const proteinItems = await this.repository.fetchMenuItems(
      menu.proteinIds || [],
    );

    return {
      id: menu.id,
      date: menu.date,
      isActive: menu.isActive ?? true,
      basePrice: Number(menu.basePrice ?? 10000),
      premiumProteinPrice: Number(menu.premiumProteinPrice ?? 11000),
      createdAt: menu.createdAt || new Date(),
      updatedAt: menu.updatedAt || new Date(),

      // Categories
      soupCategory: menu.soupCategory,
      principleCategory: menu.principleCategory,
      proteinCategory: menu.proteinCategory,
      drinkCategory: menu.drinkCategory,
      extraCategory: menu.extraCategory,
      saladCategory: menu.saladCategory,
      dessertCategory: menu.dessertCategory,

      // Item options
      soupOptions: [
        this.toMenuItemOption(menu.soupOption1),
        this.toMenuItemOption(menu.soupOption2),
      ].filter(Boolean) as MenuItemOption[],

      principleOptions: [
        this.toMenuItemOption(menu.principleOption1),
        this.toMenuItemOption(menu.principleOption2),
      ].filter(Boolean) as MenuItemOption[],

      proteinOptions: proteinItems
        .map((item: MenuItem) => this.toMenuItemOption(item))
        .filter(Boolean) as MenuItemOption[],

      drinkOptions: [
        this.toMenuItemOption(menu.drinkOption1),
        this.toMenuItemOption(menu.drinkOption2),
      ].filter(Boolean) as MenuItemOption[],

      extraOptions: [
        this.toMenuItemOption(menu.extraOption1),
        this.toMenuItemOption(menu.extraOption2),
      ].filter(Boolean) as MenuItemOption[],

      saladOptions: [
        this.toMenuItemOption(menu.saladOption1),
        this.toMenuItemOption(menu.saladOption2),
      ].filter(Boolean) as MenuItemOption[],

      dessertOptions: [
        this.toMenuItemOption(menu.dessertOption1),
        this.toMenuItemOption(menu.dessertOption2),
      ].filter(Boolean) as MenuItemOption[],
    };
  }

  /**
   * Get today's daily menu with full item details
   */
  async getTodayMenu(): Promise<DailyMenuResponse | null> {
    const menu = await this.repository.getCurrent();
    return menu ? await this.toResponse(menu) : null;
  }

  /**
   * Get daily menu for a specific date with full item details
   */
  async getMenuByDate(date: Date): Promise<DailyMenuResponse | null> {
    const menu = await this.repository.findByDate(date);
    return menu ? await this.toResponse(menu) : null;
  }

  /**
   * Transform input data to repository format
   */
  private transformInput(data: UpdateDailyMenuInput) {
    return {
      basePrice: data.basePrice,
      premiumProteinPrice: data.premiumProteinPrice,
      soupCategoryId: data.soupCategoryId,
      principleCategoryId: data.principleCategoryId,
      proteinCategoryId: data.proteinCategoryId,
      drinkCategoryId: data.drinkCategoryId,
      extraCategoryId: data.extraCategoryId,
      saladCategoryId: data.saladCategoryId,
      dessertCategoryId: data.dessertCategoryId,
      soupOption1Id: data.soupOptions?.option1Id,
      soupOption2Id: data.soupOptions?.option2Id,
      principleOption1Id: data.principleOptions?.option1Id,
      principleOption2Id: data.principleOptions?.option2Id,
      drinkOption1Id: data.drinkOptions?.option1Id,
      drinkOption2Id: data.drinkOptions?.option2Id,
      extraOption1Id: data.extraOptions?.option1Id,
      extraOption2Id: data.extraOptions?.option2Id,
      saladOption1Id: data.saladOptions?.option1Id,
      saladOption2Id: data.saladOptions?.option2Id,
      dessertOption1Id: data.dessertOptions?.option1Id,
      dessertOption2Id: data.dessertOptions?.option2Id,
      proteinIds: data.allProteinIds || [],
    };
  }

  /**
   * Update or create daily menu for today
   */
  async updateTodayMenu(
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMenu = await this.repository.findByDate(today);
    const repositoryData = this.transformInput(data);

    if (existingMenu) {
      const updated = await this.repository.updateByDate(today, repositoryData);
      return await this.toResponse(updated);
    } else {
      const created = await this.repository.create({
        date: today,
        ...repositoryData,
        isActive: true,
      });
      return await this.toResponse(created);
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

    const existingMenu = await this.repository.findByDate(normalizedDate);
    const repositoryData = this.transformInput(data);

    if (existingMenu) {
      const updated = await this.repository.updateByDate(
        normalizedDate,
        repositoryData,
      );
      return await this.toResponse(updated);
    } else {
      const created = await this.repository.create({
        date: normalizedDate,
        ...repositoryData,
        isActive: true,
      });
      return await this.toResponse(created);
    }
  }
}

// Export singleton instance
export default new DailyMenuService();
