import { MenuItem, Prisma, StockAdjustment } from "@prisma/client";
import { ItemRepositoryInterface } from "./interfaces/item.repository.interface";
import {
  CreateItemInput,
  DailyStockResetInput,
  MenuItemSearchParams,
  SetLunchFilterParams,
} from "./item.validator";
import prisma from "../../../database/prisma";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../../utils/pagination.helper";
import {
  InventoryType,
  StockAdjustmentType,
} from "../../../types/prisma.types";
import { PrismaTransaction } from "../../../types/prisma-transaction.types";

class ItemRepository implements ItemRepositoryInterface {
  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit, categoryId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MenuItemWhereInput = { deleted: false };
    
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    const [menuItems, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" }
      }),
      prisma.menuItem.count({ where }),
    ]);

    return createPaginatedResponse(menuItems, total, params);
  }

  async findById(id: number): Promise<MenuItem | null> {
    return await prisma.menuItem.findUnique({ where: { id } });
  }

  async findByCategory(categoryId: number): Promise<MenuItem[]> {
    return await prisma.menuItem.findMany({
      where: {
        categoryId,
        deleted: false,
        isAvailable: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findByIdForUpdate(
    tx: PrismaTransaction,
    itemId: number,
  ): Promise<MenuItem | null> {
    const item = await tx.menuItem.findFirst({
      where: {
        id: itemId,
        deleted: false,
      },
    });

    return item;
  }

  async create(data: CreateItemInput): Promise<MenuItem> {
    return await prisma.menuItem.create({ data });
  }

  async search(
    params: PaginationParams & MenuItemSearchParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit, search, active, categoryId } = params;
    const skip = (page - 1) * limit;

    const whereConditions: Prisma.MenuItemWhereInput = {
      deleted: false,
    };

    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (active !== undefined) {
      whereConditions.isAvailable = active;
    }

    if (categoryId !== undefined) {
      whereConditions.categoryId = Number(categoryId);
    }

    const [menuItems, total] = await Promise.all([
      prisma.menuItem.findMany({
        where: whereConditions,
        include: {
          category: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.menuItem.count({
        where: whereConditions,
      }),
    ]);

    return createPaginatedResponse(menuItems, total, { page, limit });
  }

  async findBySetLunchFilters(
    params: PaginationParams & SetLunchFilterParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit, category, minPrice, maxPrice } = params;
    const skip = (page - 1) * limit;

    const whereConditions: Prisma.MenuItemWhereInput = {
      deleted: false,
      isAvailable: true,
    };

    if (category) {
      whereConditions.category = {
        name: {
          contains: category,
          mode: "insensitive",
        },
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        whereConditions.price.lte = maxPrice;
      }
    }

    const [menuItems, total] = await Promise.all([
      prisma.menuItem.findMany({
        where: whereConditions,
        include: {
          category: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.menuItem.count({
        where: whereConditions,
      }),
    ]);

    return createPaginatedResponse(menuItems, total, { page, limit });
  }

  async updateStock(
    id: number,
    quantity: number,
    adjustmentType: string,
    reason?: string,
    userId?: string,
    orderId?: string,
    tx?: PrismaTransaction,
  ): Promise<MenuItem> {
    const client = tx || prisma;
    const item = await client.menuItem.findUnique({ where: { id } });

    if (!item) {
      throw new Error(`MenuItem with id \${id} not found`);
    }
    const previousStock = item.stockQuantity ?? 0;
    const newStock = previousStock + quantity;

    if (tx) {
      const [updatedItem] = await Promise.all([
        tx.menuItem.update({
          where: { id },
          data: {
            stockQuantity: newStock,
            isAvailable:
              item.autoMarkUnavailable && newStock <= 0
                ? false
                : item.isAvailable,
          },
        }),
        tx.stockAdjustment.create({
          data: {
            menuItemId: id,
            adjustmentType: adjustmentType as StockAdjustmentType,
            previousStock,
            newStock,
            quantity,
            reason,
            userId,
            orderId,
          },
        }),
      ]);
      return updatedItem;
    }

    const [updatedItem] = await prisma.$transaction([
      prisma.menuItem.update({
        where: { id },
        data: {
          stockQuantity: newStock,
          isAvailable:
            item.autoMarkUnavailable && newStock <= 0
              ? false
              : item.isAvailable,
        },
      }),
      prisma.stockAdjustment.create({
        data: {
          menuItemId: id,
          adjustmentType: adjustmentType as StockAdjustmentType,
          previousStock,
          newStock,
          quantity,
          reason,
          userId,
          orderId,
        },
      }),
    ]);
    return updatedItem;
  }

  async dailyStockReset(menuItems: DailyStockResetInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        menuItems.items.map((item) =>
          tx.menuItem.update({
            where: { id: item.itemId },
            data: {
              stockQuantity: item.quantity,
              lowStockAlert: item.lowStockAlert,
              isAvailable: true,
            },
          }),
        ),
      );

      await tx.stockAdjustment.createMany({
        data: menuItems.items.map((item) => ({
          menuItemId: item.itemId,
          adjustmentType: StockAdjustmentType.DAILY_RESET,
          previousStock: 0,
          newStock: item.quantity,
          quantity: item.quantity,
          reason: "Begin of the day",
        })),
      });
    });
  }

  async getLowStock(): Promise<MenuItem[]> {
    return prisma.menuItem.findMany({
      where: {
        inventoryType: InventoryType.TRACKED,
        deleted: false,
        stockQuantity: {
          lte: prisma.menuItem.fields.lowStockAlert,
        },
      },
    });
  }

  async getOutOfStock(): Promise<MenuItem[]> {
    return prisma.menuItem.findMany({
      where: {
        inventoryType: InventoryType.TRACKED,
        deleted: false,
        stockQuantity: 0,
      },
    });
  }

  async getStockHistory(
    itemId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<StockAdjustment>> {
    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where: { menuItemId: itemId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockAdjustment.count({
        where: { menuItemId: itemId },
      }),
    ]);

    return createPaginatedResponse(adjustments, total, { page, limit });
  }

  async updateStockWithData(
    tx: PrismaTransaction,
    itemId: number,
    data: Partial<MenuItem>,
  ): Promise<MenuItem> {
    return await tx.menuItem.update({
      where: { id: itemId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async createStockAdjustment(
    tx: PrismaTransaction,
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
  ): Promise<StockAdjustment> {
    return await tx.stockAdjustment.create({
      data: {
        ...data,
        adjustmentType: data.adjustmentType as StockAdjustmentType,
        createdAt: new Date(),
      },
    });
  }

  async setInventoryType(
    id: number,
    inventoryType: string,
    lowStockAlert?: number,
  ): Promise<MenuItem> {
    return prisma.menuItem.update({
      where: {
        id,
      },
      data: {
        inventoryType,
        lowStockAlert,
        ...(inventoryType === "UNLIMITED" && {
          stockQuantity: null,
        }),
      },
    });
  }

  async update(id: number, data: Partial<MenuItem>): Promise<MenuItem> {
    return prisma.menuItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.menuItem.delete({
      where: { id },
    });
  }
}

export default new ItemRepository();
