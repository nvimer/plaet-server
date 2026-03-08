import { Order, OrderItem, Prisma, MenuItem } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { CustomError } from "../../types/custom-errors";
import {
  InventoryType,
  OrderStatus,
  OrderWithItems,
  OrderWithRelations,
  OrderItemStatus,
} from "../../types/prisma.types";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { ItemServiceInterface } from "../menus/items/interfaces/item.service.interface";
import { OrderRepositoryInterface } from "./interfaces/order.repository.interface";
import { OrderServiceInterface } from "./interfaces/order.service.interface";
import {
  CreateOrderBodyInput,
  OrderSearchParams,
  UpdateOrderStatusBodyInput,
  BatchCreateOrderBodyInput,
  OrderItemInput,
} from "./order.validator";
import orderRepository from "./order.repository";
import itemService from "../menus/items/item.service";
import dailyMenuRepository from "../daily-menu/daily-menu.repository";
import { DailyMenuWithRelations } from "../daily-menu/interfaces/daily-menu.repository.interface";
import { CashClosureRepository } from "../cash-closures/cash-closure.repository";
import { getPrismaClient } from "../../database/prisma";
import { PrismaTransaction } from "../../types/prisma-transaction.types";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import { dateUtils } from "../../utils/date.utils";
import moment from "moment-timezone";

export class OrderService implements OrderServiceInterface {
  private cashClosureRepo = new CashClosureRepository();

  constructor(
    private orderRepository: OrderRepositoryInterface,
    private itemService: Pick<
      ItemServiceInterface,
      "findMenuItemById" | "deductStockForOrder" | "revertStockForOrder"
    >,
  ) {}

  /**
   * Private Helper: Determine initial status for an item
   * Fast delivery items (drinks, extras, manual items) are marked as READY immediately.
   * Prep items (protein, soup) start as PENDING.
   */
  private determineItemStatus(
    menuItemId: number | null,
    dailyMenu: DailyMenuWithRelations | null,
    isMainItem: boolean,
  ): OrderItemStatus {
    if (!menuItemId) return OrderItemStatus.READY; // Manual items are usually fast/extras

    // If it's the main protein, it needs prep/serving flow
    if (isMainItem) return OrderItemStatus.PENDING;

    // If it's a soup, it usually needs serving flow
    if (
      dailyMenu &&
      (menuItemId === dailyMenu.soupOption1Id ||
        menuItemId === dailyMenu.soupOption2Id)
    ) {
      return OrderItemStatus.PENDING;
    }

    // Everything else (drinks, extras, desserts, salads) is usually ready or served fast
    return OrderItemStatus.READY;
  }

  /**
   * Private Helper: Find Order by ID or Fail
   *
   * Centralizes the "find or fail" logic to avoid code duplication.
   * This method is used internally by other service methods that need
   * to ensure an order exists before performing operations on it.
   *
   * @params id - Order identifier
   * @returns Order with all relations
   * @throws CustomError with 404 status if order not found
   */
  /**
   * Private Helper: Find Order by ID or Fail
   *
   * Attempts to find an order by its ID. Uses the appropriate Prisma client
   * based on the environment (test database client for integration/E2E tests,
   * main client for production).
   *
   * @param id - Order identifier
   * @returns Order with all relations if found
   * @throws CustomError with 404 status if order not found
   */
  private async findOrderByIdOrFail(id: string): Promise<OrderWithRelations> {
    // Use the appropriate Prisma client based on environment
    // This ensures integration/E2E tests can find orders created in test database
    const client = getPrismaClient();

    const order = await client.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        waiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      throw new CustomError(
        `Order with ID ${id} not found`,
        HttpStatus.NOT_FOUND,
        "ORDER_NOT_FOUND",
      );
    }
    return order;
  }

  /**
   * Retrieves Paginated List of Orders
   *
   * Service layer method for fetching order with pagination and filtering.
   * This is a simple delegations to repository layer as no additional
   * business logic is required for listing.
   *
   * @param params
   * @retuns Paginated list of orders with items
   */
  /**
   * Retrieves Paginated List of Orders
   *
   * Service layer method for fetching orders with pagination and filtering.
   * Uses the appropriate Prisma client based on environment to ensure
   * integration/E2E tests can access orders in the test database.
   *
   * @param params - Pagination and filter parameters
   * @returns Paginated list of orders with items
   */
  async findAllOrders(
    params: PaginationParams & OrderSearchParams,
  ): Promise<PaginatedResponse<OrderWithItems>> {
    // Use the appropriate Prisma client based on environment
    const client = getPrismaClient();
    const { page, limit, status, type, waiterId, tableId, date } = params;
    const skip = (page - 1) * limit;

    // Build dynamic where conditions
    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (waiterId) where.waiterId = waiterId;
    if (tableId) where.tableId = tableId;
    if (date) {
      const { start, end } = dateUtils.getDayRange(date);

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // Execute query and count in parallel for performance
    const [orders, total] = await Promise.all([
      client.order.findMany({
        where,
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
          payments: true,
          waiter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      client.order.count({ where }),
    ]);

    return createPaginatedResponse(orders, total, { page, limit });
  }

  /**
   * Retrieves Specific Order by ID
   *
   * Fetches complete order details with all relations.
   * Uses Helper method to ensure order exists.
   *
   * @param id - Order identifier
   * @returns Complete order with items, table, waiter, customer
   * @throws CustomError if order not found
   */
  async findOrderById(id: string): Promise<OrderWithRelations> {
    return await this.findOrderByIdOrFail(id);
  }

  /**
   * Creates New Order with Stock Validation and Deduction
   * Complex business logic method thats orchestrates order creation
   * with stock management. This is the core operation of the order system.
   *
   * @param data - Order creation data with items
   * @returns Created order with items
   * @throws CustomError if validation fails or insufficient stock
   */
  async createOrder(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: CreateOrderBodyInput,
  ): Promise<OrderWithItems> {
    const client = getPrismaClient();

    // Fetch daily menu to get basePrice
    const orderDate = data.createdAt ? dateUtils.startOfDay(data.createdAt) : dateUtils.now();
        const dailyMenu = await dailyMenuRepository.findByCreatedAt(orderDate);
        const basePrice = dailyMenu ? Number(dailyMenu.basePrice) : 0;
    
        // Step 0: Ensure there is an open cash closure
        const activeClosure = await this.cashClosureRepo.findCurrentOpen();
        if (!activeClosure) {
          throw new CustomError(
            "No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.",
            HttpStatus.BAD_REQUEST,
            "CASH_CLOSURE_REQUIRED",
          );
        }
    
        // Step 1: Validate and fetch all menu items    // Fetch menu items only for items that have a menuItemId
    const menuItemsPromises = data.items.map((item) =>
      item.menuItemId
        ? this.itemService.findMenuItemById(item.menuItemId)
        : Promise.resolve(null),
    );
    const menuItems = await Promise.all(menuItemsPromises);

    const unavailableItems = menuItems.filter(
      (item) => item && !item.isAvailable,
    );
    if (unavailableItems.length > 0) {
      const itemNames = unavailableItems.map((item) => item?.name).join(", ");
      throw new CustomError(
        `The following items are not available: ${itemNames}`,
        HttpStatus.BAD_REQUEST,
        "ITEMS_NOT_AVAILABLE",
      );
    }

    // Step 2: Validate stock for TRACKED items
    for (let i = 0; i < data.items.length; i++) {
      const orderItem = data.items[i];
      const menuItem = menuItems[i];
      if (menuItem && menuItem.inventoryType === InventoryType.TRACKED) {
        const availableStock = menuItem?.stockQuantity ?? 0;
        if (availableStock < orderItem.quantity) {
          throw new CustomError(
            `Insufficient stock for ${menuItem?.name}`,
            HttpStatus.BAD_REQUEST,
            "INSUFFICIENT_STOCK",
          );
        }
      }
    }

    // Step 3: Find existing OPEN order for the table (DINE_IN only)
    let existingOrder: Order | null = null;
    if (data.type === "DINE_IN" && data.tableId && restaurantId) {
      existingOrder = await client.order.findFirst({
        where: {
          tableId: data.tableId,
          restaurantId: restaurantId,
          status: OrderStatus.OPEN,
        },
      });
    }

    return await client.$transaction(async (tx: PrismaTransaction) => {
      let orderId: string;
      let currentTotal = 0;

      if (existingOrder) {
        orderId = existingOrder.id;
        currentTotal = Number(existingOrder.totalAmount);

        // Find the main protein index to add basePrice only to it
        const proteinCategoryId = dailyMenu?.proteinCategoryId;
        const proteinItems = data.items
          .map((item, index) => ({
            index,
            price: Number(menuItems[index]?.price || 0),
            categoryId: menuItems[index]?.categoryId,
          }))
          .filter((item) => item.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);
        
        const mainProteinIndex = proteinItems[0]?.index;

        // Add items to existing order
        await tx.orderItem.createMany({
          data: data.items.map((item, index) => {
            const itemBasePrice = Number(menuItems[index]?.price || item.priceAtOrder || 0);
            const isMainProtein = index === mainProteinIndex;
            return {
              orderId,
              menuItemId: item.menuItemId!,
              quantity: item.quantity,
              priceAtOrder: itemBasePrice + (isMainProtein ? basePrice : 0),
              notes: item.notes,
              status: this.determineItemStatus(
                item.menuItemId!,
                dailyMenu,
                isMainProtein,
              ),
              cashClosureId: activeClosure.id,
            };
          }),
        });

        // Ensure table is marked as OCCUPIED
        await tx.table.update({
          where: { id: data.tableId! },
          data: { status: "OCCUPIED" },
        });
      } else {
        // Handle customer info (Find or Create)
        const customerId = await this.getOrCreateCustomer(
          restaurantId,
          {
            id: data.customerId,
            name: (data as any).customerName,
            phone: (data as any).customerPhone,
            phone2: (data as any).customerPhone2,
            address1: (data as any).address1,
            address2: (data as any).address2,
          },
          tx,
        );

        // Remove non-prisma fields to avoid validation errors
        const { customerName, customerPhone, customerPhone2, address1, address2, ...cleanData } = data as any;

        // Find main protein to add basePrice
        const proteinCategoryId = dailyMenu?.proteinCategoryId;
        const proteinItems = data.items
          .map((item, index) => ({
            item,
            price: Number(menuItems[index]?.price || item.priceAtOrder || 0),
            categoryId: menuItems[index]?.categoryId,
          }))
          .filter((item) => item.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);
        
        const mainProtein = proteinItems[0]?.item;

        const itemsWithBasePrice = data.items.map(item => {
          const mi = menuItems.find(m => m?.id === item.menuItemId);
          const baseItemPrice = mi ? Number(mi.price) : Number(item.priceAtOrder || 0);
          const isMainProtein = item === mainProtein;
          return {
            ...item,
            priceAtOrder: baseItemPrice + (isMainProtein ? basePrice : 0),
            status: this.determineItemStatus(
              item.menuItemId || null,
              dailyMenu,
              isMainProtein
            )
          };
        });

        const order = await this.orderRepository.create(
          waiterId,
          { ...cleanData, items: itemsWithBasePrice, customerId, restaurantId, cashClosureId: activeClosure.id },
          tx,
        );
        orderId = order.id;

        // Mark table as OCCUPIED for DINE_IN
        if (data.type === "DINE_IN" && data.tableId) {
          await tx.table.update({
            where: { id: data.tableId },
            data: { status: "OCCUPIED" },
          });
        }
      }

      // Calculate total for NEW items
      const newItemsTotal = this.calculateOrderTotal(
        data.items,
        menuItems.filter((mi): mi is MenuItem => mi !== null),
        dailyMenu,
      );

      // Update total amount (previous total + new items)
      await this.orderRepository.updateTotal(
        orderId,
        currentTotal + newItemsTotal,
        tx,
      );

      // Deduct stock for TRACKED items
      const stockDeductionPromises = data.items.map((item, index) => {
        const menuItem = menuItems[index];
        if (menuItem && menuItem.inventoryType === InventoryType.TRACKED) {
          return this.itemService.deductStockForOrder(
            item.menuItemId!,
            item.quantity,
            orderId,
            tx,
          );
        }
        return Promise.resolve();
      });
      await Promise.all(stockDeductionPromises);

      // Fetch the updated order with correct totalAmount
      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      if (!updatedOrder) {
        throw new CustomError(
          `Order with ID ${orderId} not found after creation/update`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          "ORDER_NOT_FOUND",
        );
      }

      return updatedOrder as OrderWithItems;
    });
  }

  /**
   * Updates Order Status with Validation
   *
   * Changes order status while enforcing business rules about
   * valid status transitions and side effects
   *
   * @param id - Order identifier
   * @param data - New Status
   * @returns Updated order
   * @throws CustomError if order not found or invalid transition
   */
  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusBodyInput,
  ): Promise<Order> {
    // Validate order exists
    const order = await this.findOrderByIdOrFail(id);

    // Validate terminal statuses cannot be changed
    if (order.status === OrderStatus.PAID) {
      throw new CustomError(
        "Cannot change status of paid order",
        HttpStatus.BAD_REQUEST,
        "INVALID_STATUS_TRANSITION",
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new CustomError(
        "Cannot change status of cancelled order",
        HttpStatus.BAD_REQUEST,
        "INVALID_STATUS_TRANSITION",
      );
    }

    // Update status using the appropriate Prisma client
    const client = getPrismaClient();
    return client.order.update({
      where: { id },
      data: { status: data.status },
    });
  }

  /**
   * Cancels Order and Reverts Stock
   *
   * Cancels an order and automatically reverts stock for all
   * TRACKED items. This ensures inventory accuracy.
   *
   * @param id - Order identifier
   * @returns Cancelled Order
   * @throws CustomError if order cannot be cancelled
   *
   */
  async cancelOrder(id: string): Promise<Order> {
    // Step 1: Validate order exists and get complete data
    const order = await this.findOrderByIdOrFail(id);

    // Step 2: Validate order can be cancelled
    if (order.status === OrderStatus.PAID) {
      throw new CustomError(
        "Cannot cancel paid order",
        HttpStatus.BAD_REQUEST,
        "CANNOT_CANCEL_DELIVERED_ORDER",
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new CustomError(
        "Cannot cancel cancelled order",
        HttpStatus.BAD_REQUEST,
        "ORDER_ALREADY_CANCELLED",
      );
    }

    // Step 3-4: Revert stock and cancel order in atomic transaction
    // Use the appropriate Prisma client based on environment
    const client = getPrismaClient();
    return await client.$transaction(async (tx: PrismaTransaction) => {
      // Revert stock for all TRACKED items
      const stockReversionPromises = order.items.map((orderItem) => {
        if (
          orderItem.menuItem &&
          orderItem.menuItem.inventoryType === InventoryType.TRACKED
        ) {
          return this.itemService.revertStockForOrder(
            orderItem.menuItemId!,
            orderItem.quantity,
            order.id,
            tx,
          );
        }
        return Promise.resolve();
      });
      await Promise.all(stockReversionPromises);

      // Update order status to CANCELLED using transaction client
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }

  /**
   * Calculates order total using combo pricing for setLunch orders
   *
   * For setLunch orders with proteins:
   * - Uses protein's comboPrice as base
   * - Adds price of paid extras (items with price > 0 that are not proteins)
   * - Free substitutions (price = 0) don't affect total
   *
   * For orders without proteins:
   * - Sums all individual item prices
   *
   * @param items - Order items with menu item details
   * @param menuItems - Menu items data
   * @returns Calculated total amount
   */
  private calculateOrderTotal(
    items: OrderItemInput[],
    menuItems: MenuItem[],
    dailyMenu: DailyMenuWithRelations | null,
  ): number {
    const basePrice = dailyMenu ? Number(dailyMenu.basePrice) : 0;
    const proteinCategoryId = dailyMenu?.proteinCategoryId;

    // Find items that are actually proteins
    const proteinItems = items
      .map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return { ...item, menuItem, price: Number(menuItem?.price || 0) };
      })
      .filter((item) => item.menuItem && item.menuItem.categoryId === proteinCategoryId)
      .sort((a, b) => b.price - a.price);

    const mainProtein = proteinItems[0];

    if (mainProtein) {
      // It IS a lunch: start with main protein price + basePrice
      let total = mainProtein.price + basePrice;

      // Add everything else (other proteins as extras, plus drinks, sides, etc)
      const everythingElse = items.map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return { ...item, price: Number(menuItem?.price || item.priceAtOrder || 0) };
      });

      // Find the index of the item we already used as main protein to not double count
      const mainProteinOriginalIndex = items.findIndex(i => i.menuItemId === mainProtein.menuItemId);

      everythingElse.forEach((item, index) => {
        if (index !== mainProteinOriginalIndex) {
          total += item.price * item.quantity;
        }
      });

      return total;
    } else {
      // NOT a lunch: just sum all individual prices
      return items.reduce((sum, item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        const price = Number(menuItem?.price || item.priceAtOrder || 0);
        return sum + price * item.quantity;
      }, 0);
    }
  }

  /**
   * Creates Multiple Orders in a Single Transaction (Batch Order Creation)
   *
   * Used for setLunch orders where multiple diners at the same table
   * create separate orders. All orders are created atomically - if one fails,
   * all are rolled back.
   *
   * Business Logic:
   * 1. Validates all menu items are available
   * 2. Validates stock for TRACKED items
   * 3. Calculates combo pricing for each order
   * 4. Creates all orders in a single transaction
   * 5. Deducts stock for all items
   * 6. Returns created orders with table total
   *
   * @param waiterId - Waiter creating the orders
   * @param data - Batch order data including tableId and orders array
   * @returns Created orders and table total
   */
  async batchCreateOrders(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: BatchCreateOrderBodyInput,
  ): Promise<{ orders: OrderWithItems[]; tableTotal: number }> {
    const client = getPrismaClient();

    // Fetch daily menu to get basePrice
    const firstSubOrder = data.orders[0];
    const orderDate = firstSubOrder.createdAt ? dateUtils.startOfDay(firstSubOrder.createdAt) : dateUtils.today();
    const dailyMenu = await dailyMenuRepository.findByCreatedAt(orderDate);
    const basePrice = dailyMenu ? Number(dailyMenu.basePrice) : 0;

    // Step 0: Ensure there is an open cash closure
    const activeClosure = await this.cashClosureRepo.findCurrentOpen(restaurantId || undefined);
    if (!activeClosure) {
      throw new CustomError(
        "No hay un turno de caja abierto. Por favor abre caja antes de crear pedidos.",
        HttpStatus.BAD_REQUEST,
        "CASH_CLOSURE_REQUIRED",
      );
    }

    const existingOrder = data.tableId
      ? await client.order.findFirst({
          where: {
            tableId: data.tableId,
            status: OrderStatus.OPEN,
          },
        })
      : null;

    return await client.$transaction(async (tx: PrismaTransaction) => {
      let masterOrderId: string;
      let tableTotal = existingOrder ? Number(existingOrder.totalAmount) : 0;

      if (existingOrder) {
        masterOrderId = existingOrder.id;
      } else {
        const firstSubOrder = data.orders[0];
        const restaurantId = (
          await tx.user.findUnique({
            where: { id: waiterId },
            select: { restaurantId: true },
          })
        )?.restaurantId;

        // Handle customer info for first sub-order
        const customerId = await this.getOrCreateCustomer(
          restaurantId,
          {
            id: firstSubOrder.customerId,
            name: (firstSubOrder as any).customerName,
            phone: (firstSubOrder as any).customerPhone,
            phone2: (firstSubOrder as any).customerPhone2,
            address1: (firstSubOrder as any).address1,
            address2: (firstSubOrder as any).address2,
          },
          tx,
        );

        const newOrder = await this.orderRepository.create(
          waiterId,
          {
            tableId: data.tableId,
            type: firstSubOrder.type,
            customerId: customerId || undefined,
            items: [],
            notes: "Group Order",
            createdAt: firstSubOrder.createdAt || dateUtils.now(),
            cashClosureId: activeClosure.id,
          } as any,
          tx,
        );
        masterOrderId = newOrder.id;
      }

      const allMenuItemIds = new Set<number>();
      data.orders.forEach((o) =>
        o.items.forEach((i) => {
          if (i.menuItemId) allMenuItemIds.add(i.menuItemId);
        }),
      );

      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: Array.from(allMenuItemIds) }, deleted: false },
      });

      for (const subOrder of data.orders) {
        const orderMenuItems = subOrder.items
          .map((item) =>
            item.menuItemId
              ? menuItems.find((mi) => mi.id === item.menuItemId)
              : null,
          )
          .filter((mi) => mi !== null) as any[];

        const serviceAmount = this.calculateOrderTotal(
          subOrder.items.filter((i) => i.menuItemId) as any,
          orderMenuItems,
          dailyMenu,
        );

        const manualItemsAmount = subOrder.items
          .filter((i) => !i.menuItemId)
          .reduce(
            (sum, i) => sum + Number(i.priceAtOrder || 0) * i.quantity,
            0,
          );

        tableTotal += serviceAmount + manualItemsAmount;

        // Find main protein in this sub-order to add basePrice only to it
        const proteinCategoryId = dailyMenu?.proteinCategoryId;
        const subProteinsWithPrices = subOrder.items
          .map((item, idx) => {
            const mi = item.menuItemId ? menuItems.find((m) => m.id === item.menuItemId) : null;
            return {
              idx,
              price: Number(mi?.price || item.priceAtOrder || 0),
              categoryId: mi?.categoryId,
            };
          })
          .filter((p) => p.categoryId === proteinCategoryId)
          .sort((a, b) => b.price - a.price);

        const mainProteinIdx = subProteinsWithPrices[0]?.idx;

        await tx.orderItem.createMany({
          data: subOrder.items.map((item, index) => {
            const mi = item.menuItemId
              ? menuItems.find((m) => m.id === item.menuItemId)
              : null;
            const itemPrice = mi ? Number(mi.price) : Number(item.priceAtOrder || 0);
            const isMainProtein = index === mainProteinIdx;
            
            return {
              orderId: masterOrderId,
              menuItemId: item.menuItemId ?? null,
              quantity: item.quantity,
              priceAtOrder: itemPrice + (isMainProtein ? basePrice : 0),
              notes: item.notes ?? null,
              status: this.determineItemStatus(
                item.menuItemId ?? null,
                dailyMenu,
                isMainProtein
              ),
              createdAt: subOrder.createdAt ?? dateUtils.now(),
            };
          }),
        });

        for (const item of subOrder.items) {
          const mi = item.menuItemId
            ? menuItems.find((m) => m.id === item.menuItemId)
            : null;
          if (mi && mi.inventoryType === InventoryType.TRACKED) {
            await this.itemService.deductStockForOrder(
              item.menuItemId!,
              item.quantity,
              masterOrderId,
              tx,
            );
          }
        }
      }

      await this.orderRepository.updateTotal(masterOrderId, tableTotal, tx);

      // Ensure table is marked as OCCUPIED for DINE_IN
      if (data.tableId) {
        await tx.table.update({
          where: { id: data.tableId },
          data: { status: "OCCUPIED" },
        });
      }

      const completeOrder = await tx.order.findUnique({
        where: { id: masterOrderId },
        include: { items: { include: { menuItem: true } } },
      });

      return { orders: [completeOrder as OrderWithItems], tableTotal };
    });
  }

  /**
   * Updates the status of an individual order item
   *
   * @param orderId - Order identifier
   * @param itemId - Item identifier
   * @param status - New status
   * @returns Updated order item
   */
  private async getOrCreateCustomer(
    restaurantId: string | null | undefined,
    data: { 
      id?: string; 
      name?: string; 
      phone?: string;
      phone2?: string;
      address1?: string;
      address2?: string;
    },
    tx: PrismaTransaction,
  ): Promise<string | null> {
    if (data.id) return data.id;
    if (!data.phone || !restaurantId) return null;

    const existing = await tx.customer.findFirst({
      where: {
        restaurantId,
        OR: [{ phone: data.phone }, { phone2: data.phone }],
      },
    });

    if (existing) {
      // Update customer data if it has changed or was missing
      await tx.customer.update({
        where: { id: existing.id },
        data: {
          phone2: data.phone2 || existing.phone2,
          address1: data.address1 || existing.address1,
          address2: data.address2 || existing.address2,
        },
      });
      return existing.id;
    }

    // Create new customer
    const nameParts = (data.name || "Cliente").trim().split(" ");
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Sazonarte";

    const newCustomer = await tx.customer.create({
      data: {
        restaurantId,
        firstName,
        lastName,
        phone: data.phone,
        phone2: data.phone2,
        address1: data.address1,
        address2: data.address2,
      },
    });

    return newCustomer.id;
  }

  async updateOrderItemStatus(
    orderId: string,
    itemId: number,
    status: OrderItemStatus,
  ): Promise<OrderItem> {
    // 1. Ensure order exists
    await this.findOrderByIdOrFail(orderId);

    // 2. Update item status
    return await this.orderRepository.updateItemStatus(orderId, itemId, status);
  }
}

export default new OrderService(orderRepository, itemService);
