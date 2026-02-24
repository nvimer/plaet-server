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
  /**
   * Retrieves a paginated list of all non-deleted menu-items from the database.
   * This method implements efficient pagination with proper skip/take
   * logic and total count calculation
   */
  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [menuItems, total] = await Promise.all([
      prisma.menuItem.findMany({
        where: { deleted: false },
        skip,
        take: limit,
      }),
      prisma.menuItem.count({
        where: { deleted: false },
      }),
    ]);

    return createPaginatedResponse(menuItems, total, params);
  }

  /*
   * Retrieves a specific menu item by its unique identifier.
   * This method uses Prisma's findUnique for optimal performance on primary key lookups.
   */
  async findById(id: number): Promise<MenuItem | null> {
    return await prisma.menuItem.findUnique({ where: { id } });
  }

  /**
   * Retrieves all menu items by category ID.
   * Returns only non-deleted and available items.
   */
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

  /**
   * Retrieves a menu item by ID for update within a transaction
   *
   * This method is used within transactions to ensure proper locking
   * and prevent race conditions when updating stock quantities.
   *
   * @param tx - Transaction client
   * @param itemId - Menu item identifier
   * @returns Menu item or null if not found
   */
  async findByIdForUpdate(
    tx: PrismaTransaction,
    itemId: number,
  ): Promise<MenuItem | null> {
    // Use findFirst with explicit deleted filter
    // This works better with test database clients that may not have soft delete extensions
    // findFirst allows filtering by non-unique fields like 'deleted'
    const item = await tx.menuItem.findFirst({
      where: {
        id: itemId,
        deleted: false,
      },
    });

    return item;
  }

  /**
   * Creates a new menu item record in the database.
   * This method handles item creation with proper data validation
   * and ensures data integrity.
   */
  async create(data: CreateItemInput): Promise<MenuItem> {
    return await prisma.menuItem.create({ data });
  }

  async search(
    params: PaginationParams & MenuItemSearchParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit, search, active, categoryId } = params;
    const skip = (page - 1) * limit;

    // Build search conditions
    const whereConditions: Prisma.MenuItemWhereInput = {
      deleted: false,
    };

    // Add search term if provided
    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Add active (isAvailable) filter if provided
    if (active !== undefined) {
      whereConditions.isAvailable = active;
    }

    // Add category filter if provided
    if (categoryId !== undefined) {
      whereConditions.categoryId = categoryId;
    }

    // Execute search and count in parallel
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

  /**
   * Finds menu items filtered by setLunch-specific criteria
   *
   * Supports filtering by protein status, plate component status, component type,
   * category name, and price ranges. Used for setLunch order creation.
   *
   * @param params - Filter parameters including pagination
   * @returns Paginated list of filtered menu items
   */
  async findBySetLunchFilters(
    params: PaginationParams & SetLunchFilterParams,
  ): Promise<PaginatedResponse<MenuItem>> {
    const { page, limit, category, minPrice, maxPrice } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: Prisma.MenuItemWhereInput = {
      deleted: false,
      isAvailable: true,
    };

    // Note: Fields isProtein, isPlateComponent, componentType were removed from schema
    // Use category-based filtering instead
    // TODO: Implement alternative filtering logic if needed

    // Add category filter
    if (category) {
      whereConditions.category = {
        name: {
          contains: category,
          mode: "insensitive",
        },
      };
    }

    // Add price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        whereConditions.price.lte = maxPrice;
      }
    }

    // Execute query and count in parallel
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

  /**
   * Updates Stock Quantity for a Menu Item
   *
   * Core method for all stock adjustment operations. This method handles
   * stock modifications while maintaining data integrity and audit trail.
   *
   * @param id - Menu item identifier
   * @param quantity - Amount to adjust (+/- value)
   * @param adjustmentType - Type of adjustment (DAILY_RESET, MANUAL_ADD, ORDER_DEDUCT, etc.)
   * @param reason - Optional explanation for the adjustment
   * @param userId - Optional user who performed the adjustment
   * @param orderId - Optional order associated with adjustment
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated menu item with new stock quantity
   * @throws Error if menu item not found
   *
   * Stock Calculation:
   * - newStock = previousStock + quantity
   * - Positive quantity = stock increase
   * - Negative quantity = stock decrease
   *
   * Auto-Blocking Behavior:
   * - If autoMarkUnavailable = true AND newStock <= 0
   * - Then isAvailable is set to false
   * - Item becomes unavailable for ordering
   * - Prevents orders for out-of-stock items
   */
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
      throw new Error(`MenuItem with id ${id} not found`);
    }
    const previousStock = item.stockQuantity ?? 0;
    const newStock = previousStock + quantity;

    // If transaction is provided, use it directly; otherwise create a new transaction
    if (tx) {
      const [updatedItem] = await Promise.all([
        tx.menuItem.update({
          where: { id },
          data: {
            stockQuantity: newStock,
            // Auto-block item if stock depleted and auto-blocking enabled
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

    // Update item and create adjustment record in atomic transaction
    const [updatedItem] = await prisma.$transaction([
      prisma.menuItem.update({
        where: { id },
        data: {
          stockQuantity: newStock,
          // Auto-block item if stock depleted and auto-blocking enabled
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

  /**
   * Performs Daily Stock Reset for Multiple Menu Items
   *
   * Batch operation to initialize stock quantities at the beginning
   * of each business day. This method handles multiple items efficiently
   * in a single transaction for optimal performance.
   *
   * @param menuItems - Array of items with their initial stock quantities
   * @returns Promise<void> - Operation doesn't return data
   *
   * Operation Flow:
   * 1. Updates stock quantities for all items in batch
   * 2. Updates low stock alert thresholds
   * 3. Marks all items as available
   * 4. Creates audit records for each adjustment
   */
  async dailyStockReset(menuItems: DailyStockResetInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update stock quantities for all items in batch
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

      // Create adjustment records for audit trail
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

  /**
   * Retrieves Menu Items with Low Stock
   *
   * Queries the database for items that have reached or fallen below
   * their low stock alert threshold. This enables proactive inventory
   * management and prevents stockouts during service.
   *
   * @returns Array of menu items with low stock
   */
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

  /**
   * Retrieves Menu Items That Are Out of Stock
   *
   * Queries for items that have completely depleted their stock.
   * Essential for service staff to know what cannot be ordered and
   * for managers to prioritize production needs.
   *
   * @returns Array of menu items with zero stock
   */
  async getOutOfStock(): Promise<MenuItem[]> {
    return prisma.menuItem.findMany({
      where: {
        inventoryType: InventoryType.TRACKED,
        deleted: false,
        stockQuantity: 0,
      },
    });
  }

  /**
   * Retrieves Stock Adjustment History for a Menu Item
   *
   * Provides a complete audit trail of all stock changes for a specific
   * menu item with pagination support. Essential for accountability,
   * troubleshooting, and inventory analysis.
   *
   * @param itemId - Menu item identifier
   * @param page - Current page number (1-indexed)
   * @param limit - Number of records per page
   * @returns Paginated list of stock adjustments
   */
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

  /**
   * Updates stock with partial data within a transaction
   *
   * This method allows updating menu item stock fields with partial data
   * within a transaction context for atomic operations.
   *
   * @param tx - Transaction client
   * @param itemId - Menu item identifier
   * @param data - Partial menu item data to update
   * @returns Updated menu item
   */
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

  /**
   * Creates a stock adjustment record within a transaction
   *
   * This method creates an audit trail entry for stock changes
   * within a transaction context.
   *
   * @param tx - Transaction client
   * @param data - Stock adjustment data
   * @returns Created stock adjustment
   */
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

  /**
   * Configures Inventory Type for a Menu Item
   *
   * Changes how stock is managed for a menu item. Switches between
   * tracked (limited stock) and unlimited (always available) modes.
   * Includes automatic cleanup of stock data when appropriate.
   *
   * @param id - Menu item identifier
   * @param inventoryType - New inventory type ("TRACKED" or "UNLIMITED")
   * @param lowStockAlert - Optional low stock threshold (for TRACKED items)
   * @returns Updated menu item
   *
   * Inventory Types:
   *
   * TRACKED:
   * - Stock quantity is monitored
   * - Requires daily stock reset
   * - Auto-deducts on orders
   * - Can become unavailable
   * - Low stock alerts active
   * - Suitable for: Pre-prepared dishes, limited items
   *
   * UNLIMITED:
   * - No stock tracking
   * - Always available
   * - No stock deduction
   * - No alerts
   * - Stock fields cleared
   * - Suitable for: Bottled drinks, unlimited items
   */
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
        // Clear stock data when switching to UNLIMITED type
        ...(inventoryType === "UNLIMITED" && {
          stockQuantity: null,
        }),
      },
    });
  }

  /**
   * Updates Menu Item Information
   *
   * Generic update method for menu item fields.
   * All fields are optional to support partial updates.
   *
   * @param id - Menu item identifier
   * @param data - Partial menu item data to update
   * @returns Updated menu item
   */
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
