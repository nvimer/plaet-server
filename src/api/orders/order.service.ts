import { Order, Prisma, MenuItem } from "@prisma/client";
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
import { getPrismaClient } from "../../database/prisma";
import { PrismaTransaction } from "../../types/prisma-transaction.types";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import { v4 as uuidv4 } from "uuid";

export class OrderService implements OrderServiceInterface {
  constructor(
    private orderRepository: OrderRepositoryInterface,
    private itemService: Pick<
      ItemServiceInterface,
      "findMenuItemById" | "deductStockForOrder" | "revertStockForOrder"
    >,
  ) {}

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
      // Filter by date (start of day to end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
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
    id: string,
    data: CreateOrderBodyInput,
  ): Promise<OrderWithItems> {
    // Step 1: Validate and fetch all menu items
    const menuItemsPromises = data.items.map((item) =>
      this.itemService.findMenuItemById(item.menuItemId),
    );

    const menuItems = await Promise.all(menuItemsPromises);

    const unavailableItems = menuItems.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      const itemNames = unavailableItems.map((item) => item.name).join(", ");
      throw new CustomError(
        `The following items are not available: ${itemNames}`,
        HttpStatus.BAD_REQUEST,
        "ITEMS_NOT_AVAILABLE",
      );
    }

    // Step 3: Validate stock for TRACKED items
    for (let i = 0; i < data.items.length; i++) {
      const orderItem = data.items[i];
      const menuItem = menuItems[i];

      // Only validate stock for TRACKED items
      if (menuItem.inventoryType === InventoryType.TRACKED) {
        const availableStock = menuItem.stockQuantity ?? 0;

        if (availableStock < orderItem.quantity) {
          throw new CustomError(
            `Insufficient stock for ${menuItem.name}`,
            HttpStatus.BAD_REQUEST,
            "INSUFFICIENT_STOCK",
          );
        }
      }
    }

    // Step 4: Prepare order data with prices
    const orderDataWithPrices = {
      ...data,
      items: data.items.map((item, index) => ({
        ...item,
        priceAtOrder: menuItems[index].price,
      })),
    };

    // Step 5: Calculate total amount
    const totalAmount = orderDataWithPrices.items.reduce(
      (sum, item) => sum + Number(item.priceAtOrder) * item.quantity,
      0,
    );

    // Step 6-8: Create order, update total, and deduct stock in atomic transaction
    // Use the appropriate Prisma client based on environment
    const client = getPrismaClient();
    return await client.$transaction(async (tx: PrismaTransaction) => {
      // Create order with items
      const order = await this.orderRepository.create(
        id,
        orderDataWithPrices,
        tx,
      );

      // Update total amount
      await this.orderRepository.updateTotal(order.id, totalAmount, tx);

      // Deduct stock for TRACKED items
      const stockDeductionPromises = data.items.map((item, index) => {
        const menuItem = menuItems[index];
        if (menuItem.inventoryType === InventoryType.TRACKED) {
          return this.itemService.deductStockForOrder(
            item.menuItemId,
            item.quantity,
            order.id,
            tx,
          );
        }
        return Promise.resolve();
      });

      await Promise.all(stockDeductionPromises);

      // Fetch the updated order with correct totalAmount
      // Use the transaction client to ensure we get the updated data
      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
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
          `Order with ID ${order.id} not found after creation`,
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
    if (order.status === OrderStatus.DELIVERED) {
      throw new CustomError(
        "Cannot change status of delivered order",
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
    if (order.status === OrderStatus.DELIVERED) {
      throw new CustomError(
        "Cannot cancel delivered order",
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
  ): number {
    // Find the most expensive item (assumed to be the main protein)
    const sortedItems = items
      .map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return { ...item, menuItem, price: Number(menuItem?.price || 0) };
      })
      .sort((a, b) => b.price - a.price);

    const mainItem = sortedItems[0];

    if (mainItem) {
      // SetLunch pricing: start with main item price
      let total = mainItem.price;

      // Add paid extras (other items with price > 0)
      const extras = sortedItems.slice(1).filter((item) => item.price > 0);

      extras.forEach((item) => {
        total += item.price * item.quantity;
      });

      return total;
    } else {
      // No protein: sum of all individual prices
      return items.reduce((sum, item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return sum + Number(menuItem?.price || 0) * item.quantity;
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
    data: BatchCreateOrderBodyInput,
  ): Promise<{ orders: OrderWithItems[]; tableTotal: number }> {
    const client = getPrismaClient();

    return await client.$transaction(async (tx: PrismaTransaction) => {
      const createdOrders: OrderWithItems[] = [];
      let tableTotal = 0;

      // Collect all unique menu item IDs from all orders
      const allMenuItemIds = new Set<number>();
      data.orders.forEach((order) => {
        order.items.forEach((item) => allMenuItemIds.add(item.menuItemId));
      });

      // Fetch all menu items in a single query
      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: Array.from(allMenuItemIds) },
          deleted: false,
        },
      });

      // Validate all items exist
      const foundIds = new Set(menuItems.map((mi) => mi.id));
      const missingIds = Array.from(allMenuItemIds).filter(
        (id) => !foundIds.has(id),
      );
      if (missingIds.length > 0) {
        throw new CustomError(
          `Menu items not found: ${missingIds.join(", ")}`,
          HttpStatus.NOT_FOUND,
          "ITEMS_NOT_FOUND",
        );
      }

      // Validate all items are available
      const unavailableItems = menuItems.filter((item) => !item.isAvailable);
      if (unavailableItems.length > 0) {
        const itemNames = unavailableItems.map((item) => item.name).join(", ");
        throw new CustomError(
          `The following items are not available: ${itemNames}`,
          HttpStatus.BAD_REQUEST,
          "ITEMS_NOT_AVAILABLE",
        );
      }

      // Validate stock for all orders
      const stockRequirements = new Map<number, number>();
      data.orders.forEach((order) => {
        order.items.forEach((item) => {
          const current = stockRequirements.get(item.menuItemId) || 0;
          stockRequirements.set(item.menuItemId, current + item.quantity);
        });
      });

      for (const [itemId, requiredQty] of stockRequirements.entries()) {
        const menuItem = menuItems.find((mi) => mi.id === itemId);
        if (menuItem?.inventoryType === InventoryType.TRACKED) {
          const availableStock = menuItem.stockQuantity ?? 0;
          if (availableStock < requiredQty) {
            throw new CustomError(
              `Insufficient stock for ${menuItem.name}. Available: ${availableStock}, Required: ${requiredQty}`,
              HttpStatus.BAD_REQUEST,
              "INSUFFICIENT_STOCK",
            );
          }
        }
      }

      // Create each order
      for (const orderData of data.orders) {
        const orderItems = orderData.items;
        const orderMenuItems = orderItems.map(
          (item) => menuItems.find((mi) => mi.id === item.menuItemId)!,
        );

        // Calculate total using combo pricing
        const totalAmount = this.calculateOrderTotal(
          orderItems,
          orderMenuItems,
        );

        // Prepare order data with prices and setLunch fields
        const orderId = uuidv4();
        const preparedItems = orderItems.map((item) => {
          const menuItem = orderMenuItems.find(
            (mi) => mi.id === item.menuItemId,
          )!;
          return {
            ...item,
            priceAtOrder: Number(menuItem.price),
          };
        });

        // Create the order
        const createData: CreateOrderBodyInput = {
          tableId: data.tableId,
          type: orderData.type,
          customerId: orderData.customerId,
          items: preparedItems,
          notes: orderData.notes,
        };

        const order = await this.orderRepository.create(
          waiterId,
          createData,
          tx,
        );

        // Update order total
        await this.orderRepository.updateTotal(order.id, totalAmount, tx);

        // Deduct stock
        const stockDeductionPromises = orderItems.map((item) => {
          const menuItem = orderMenuItems.find(
            (mi) => mi.id === item.menuItemId,
          )!;
          if (menuItem.inventoryType === InventoryType.TRACKED) {
            return this.itemService.deductStockForOrder(
              item.menuItemId,
              item.quantity,
              order.id,
              tx,
            );
          }
          return Promise.resolve();
        });
        await Promise.all(stockDeductionPromises);

        // Fetch the complete order with items
        const completeOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        });

        if (!completeOrder) {
          throw new CustomError(
            `Order ${order.id} not found after creation`,
            HttpStatus.INTERNAL_SERVER_ERROR,
            "ORDER_NOT_FOUND",
          );
        }

        createdOrders.push(completeOrder as OrderWithItems);
        tableTotal += totalAmount;
      }

      return { orders: createdOrders, tableTotal };
    });
  }
}

export default new OrderService(orderRepository, itemService);
