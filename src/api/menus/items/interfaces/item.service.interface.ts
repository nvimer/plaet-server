import { MenuItem, StockAdjustment } from "@prisma/client";
import {
  AddStockBodyInput,
  CreateItemInput,
  DailyStockResetInput,
  InventoryTypeInput,
  MenuItemSearchParams,
  RemoveStockBodyInput,
  StockHistoryParams,
  SetLunchFilterParams,
} from "../item.validator";
import {
  PaginatedResponse,
  PaginationParams,
} from "../../../../interfaces/pagination.interfaces";

export interface ItemServiceInterface {
  findAllMenuItems(
    params: PaginationParams,
  ): Promise<PaginatedResponse<MenuItem>>;
  findMenuItemById(id: number): Promise<MenuItem>;
  createItem(data: CreateItemInput): Promise<MenuItem>;

  searchMenuItems(
    params: PaginationParams & MenuItemSearchParams,
  ): Promise<PaginatedResponse<MenuItem>>;
  getSetLunchItems(
    params: PaginationParams & SetLunchFilterParams,
  ): Promise<PaginatedResponse<MenuItem>>;
  dailyStockReset(data: DailyStockResetInput): Promise<void>;
  addStock(
    id: number,
    data: AddStockBodyInput,
    userId?: string,
  ): Promise<MenuItem>;
  removeStock(
    id: number,
    data: RemoveStockBodyInput,
    userId?: string,
  ): Promise<MenuItem>;
  deductStockForOrder(
    itemId: number,
    quantity: number,
    orderId: string,
    tx?: import("../../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<void>;
  revertStockForOrder(
    itemId: number,
    quantity: number,
    orderId: string,
    tx?: import("../../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<void>;
  getLowStock(): Promise<MenuItem[]>;
  getOutStock(): Promise<MenuItem[]>;
  getStockHistory(
    id: number,
    params: StockHistoryParams,
  ): Promise<PaginatedResponse<StockAdjustment>>;
  setInventoryType(id: number, data: InventoryTypeInput): Promise<MenuItem>;
}
