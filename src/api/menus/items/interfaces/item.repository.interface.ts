import { MenuItem, StockAdjustment } from "@prisma/client";
import {
  CreateItemInput,
  DailyStockResetInput,
  MenuItemSearchParams,
  SetLunchFilterParams,
} from "../item.validator";
import {
  PaginatedResponse,
  PaginationParams,
} from "../../../../interfaces/pagination.interfaces";

/**
 * Menu Item Repository Interface
 *
 * Defines the contract for menu item repository implementations.
 * This interface ensures consistency across different menu item repository
 * implementations and provides clear documentation of expected methods.
 */
export interface ItemRepositoryInterface {
  findAll(params: PaginationParams): Promise<PaginatedResponse<MenuItem>>;
  findById(id: number): Promise<MenuItem | null>;
  findByCategory(categoryId: number): Promise<MenuItem[]>;
  findByIdForUpdate(
    tx: import("../../../../types/prisma-transaction.types").PrismaTransaction,
    itemId: number,
  ): Promise<MenuItem | null>;
  create(data: CreateItemInput & { restaurantId?: string }): Promise<MenuItem>;

  search(
    params: PaginationParams &
      MenuItemSearchParams & {
        itemIds?: number[];
        excludedCategoryIds?: number[];
      },
  ): Promise<PaginatedResponse<MenuItem>>;
  findBySetLunchFilters(
    params: PaginationParams & SetLunchFilterParams,
  ): Promise<PaginatedResponse<MenuItem>>;
  updateStock(
    id: number,
    quantity: number,
    adjustmentType: string,
    reason?: string,
    userId?: string,
    orderId?: string,
    tx?: import("../../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<MenuItem>;
  updateStockWithData(
    tx: import("../../../../types/prisma-transaction.types").PrismaTransaction,
    itemId: number,
    data: Partial<MenuItem>,
  ): Promise<MenuItem>;
  createStockAdjustment(
    tx: import("../../../../types/prisma-transaction.types").PrismaTransaction,
    data: {
      menuItemId: number;
      adjustmentType: string;
      previousStock: number;
      newStock: number;
      quantity: number;
      reason?: string;
      userId?: string;
      orderId?: string;
    },
  ): Promise<StockAdjustment>;
  dailyStockReset(items: DailyStockResetInput): Promise<void>;
  getLowStock(): Promise<MenuItem[]>;
  getOutOfStock(): Promise<MenuItem[]>;
  getStockHistory(
    itemId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<StockAdjustment>>;
  findAllStockHistory(
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<StockAdjustment & { menuItem: MenuItem }>>;
  setInventoryType(
    id: number,
    inventoryType: string,
    lowStockAlert?: number,
  ): Promise<MenuItem>;
  update(id: number, data: Partial<MenuItem>): Promise<MenuItem>;
  delete(id: number): Promise<void>;
  getStockMovementsByDay(
    days?: number,
  ): Promise<{ day: string; entradas: number; salidas: number }[]>;
}
