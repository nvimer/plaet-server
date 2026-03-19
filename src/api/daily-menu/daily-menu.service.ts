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
import { dateUtils } from "../../utils/date.utils";

/**
 * DailyMenu Service Implementation - Updated for Item-Based Daily Menu
 * Contains business logic for daily menu operations with MenuItem references
 */
class DailyMenuService implements DailyMenuServiceInterface {
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
      imageUrl: item.imageUrl,
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
      isActive: menu.isActive ?? true,
      basePrice: Number(menu.basePrice ?? 3000), // Base margin (e.g., $3,000)
      packagingFee: Number(menu.packagingFee ?? 1000), // Packaging cost
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt || new Date(),

      // Categories
      soupCategory: menu.soupCategory,
      principleCategory: menu.principleCategory,
      proteinCategory: menu.proteinCategory,
      drinkCategory: menu.drinkCategory,
      extraCategory: menu.extraCategory,
      saladCategory: menu.saladCategory,
      riceCategory: menu.riceCategory,
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

      riceOptions: [
        this.toMenuItemOption(menu.riceOption1),
        this.toMenuItemOption(menu.riceOption2),
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
   * Get daily menu for a specific createdAt with full item details
   */
  async getMenuByCreatedAt(createdAt: Date): Promise<DailyMenuResponse | null> {
    const menu = await this.repository.findByCreatedAt(createdAt);
    return menu ? await this.toResponse(menu) : null;
  }

  /**
   * Transform input data to repository format
   */
  private transformInput(data: UpdateDailyMenuInput) {
    return {
      basePrice: data.basePrice, // Base margin for lunch
      packagingFee: data.packagingFee, // Packaging cost
      soupCategoryId: data.soupCategoryId,
      principleCategoryId: data.principleCategoryId,
      proteinCategoryId: data.proteinCategoryId,
      drinkCategoryId: data.drinkCategoryId,
      extraCategoryId: data.extraCategoryId,
      saladCategoryId: data.saladCategoryId,
      riceCategoryId: data.riceCategoryId,
      dessertCategoryId: data.dessertCategoryId,
      soupOption1Id: data.soupOptions?.option1Id,
      soupOption2Id: data.soupOptions?.option2Id,
      principleOption1Id: data.principleOptions?.option1Id,
      principleOption2Id: data.principleOptions?.option2Id,
      riceOption1Id: data.riceOptions?.option1Id,
      riceOption2Id: data.riceOptions?.option2Id,
      drinkOption1Id: data.drinkOptions?.option1Id,
      drinkOption2Id: data.drinkOptions?.option2Id,
      extraOption1Id: data.extraOptions?.option1Id,
      extraOption2Id: data.extraOptions?.option2Id,
      saladOption1Id: data.saladOptions?.option1Id,
      saladOption2Id: data.saladOptions?.option2Id,
      dessertOption1Id: data.dessertOptions?.option1Id,
      dessertOption2Id: data.dessertOptions?.option2Id,
      proteinIds: data.allProteinIds || [],
      createdAt: data.createdAt,
    };
  }

  /**
   * Update or create daily menu for today
   */

  async getHistory(page: number, limit: number) {
    const result = await this.repository.getHistory(page, limit);
    const mappedData = await Promise.all(
      result.data.map((m: DailyMenuWithRelations) => this.toResponse(m)),
    );
    return {
      data: mappedData,
      meta: result.meta,
    };
  }

  async updateTodayMenu(
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse> {
    const today = dateUtils.today();

    const existingMenu = await this.repository.findByCreatedAt(today);
    const repositoryData = this.transformInput({
      ...data,
      createdAt: today,
    });

    if (existingMenu) {
      const updated = await this.repository.updateByCreatedAt(
        today,
        repositoryData,
      );
      return await this.toResponse(updated);
    } else {
      const created = await this.repository.create({
        ...repositoryData,
        createdAt: today,
        isActive: true,
      });
      return await this.toResponse(created);
    }
  }

  /**
   * Update daily menu for a specific createdAt
   */
  async updateMenuByCreatedAt(
    createdAt: Date,
    data: UpdateDailyMenuInput,
  ): Promise<DailyMenuResponse> {
    const normalizedDate = dateUtils.startOfDay(createdAt);

    const existingMenu = await this.repository.findByCreatedAt(normalizedDate);
    const repositoryData = this.transformInput(data);

    if (existingMenu) {
      const updated = await this.repository.updateByCreatedAt(
        normalizedDate,
        repositoryData,
      );
      return await this.toResponse(updated);
    } else {
      const created = await this.repository.create({
        ...repositoryData,
        createdAt: normalizedDate,
        isActive: true,
      });
      return await this.toResponse(created);
    }
  }
}

// Export singleton instance
export default new DailyMenuService();
