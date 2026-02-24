import { Order, Prisma } from "@prisma/client";
import { OrderRepositoryInterface } from "./interfaces/order.repository.interface";
import { CreateOrderBodyInput, OrderSearchParams } from "./order.validator";
import {
  PaginatedResponse,
  PaginationParams,
} from "../../interfaces/pagination.interfaces";
import {
  OrderStatus,
  OrderWithItems,
  OrderWithRelations,
} from "../../types/prisma.types";
import { getPrismaClient } from "../../database/prisma";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import { PrismaTransaction } from "../../types/prisma-transaction.types";

class OrderRepository implements OrderRepositoryInterface {
  /**
   * Retrieves Paginated List of Orders with Filtering
   *
   * Fetches orders with their items and optional filters for status,
   * type, waiter, table, and date. Implements efficient pagination.
   *
   * @param params - Pagination and filter parameters
   * @returns Paginated response with orders and metadata
   */
  async findAll(
    params: PaginationParams & OrderSearchParams,
  ): Promise<PaginatedResponse<OrderWithItems>> {
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

    // Execute query and count and parallel for perfomance
    const client = getPrismaClient();
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
   * Retrieves Specific Order by ID with All Relations
   *
   * Fetches complete order details including items, table, waiter,
   * customer, and payment informtion. Used for detailed order views.
   *
   * @param id - Order identifier (UUID)
   * @returns Complete order with all relations, or null if not found
   */
  async findById(id: string): Promise<OrderWithRelations | null> {
    const client = getPrismaClient();
    return client.order.findUnique({
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
  }

  /**
   * Creates New Order with Items in Atomic Transaction
   *
   * Creates an order and its items in a single database transaction
   * to ensure data consistency. If any part fails, entire operation
   * is rolled back.
   *
   * @param waiterId - Waiter identifier
   * @param data - Order creation data with items
   * @param tx - Optional transaction client for atomic operations
   * @returns Created order with items
   */
  async create(
    waiterId: string,
    data: CreateOrderBodyInput,
    tx?: PrismaTransaction,
  ): Promise<OrderWithItems> {
    const client = tx || getPrismaClient();
    // Extract items from order data
    const { items, ...orderData } = data;

    // Create order with items
    const order = await client.order.create({
      data: {
        ...orderData,
        waiterId,
        status: OrderStatus.PENDING,
        totalAmount: 0,
        createdAt: orderData.createdAt, // Support historical date entry
        items: {
          create: items?.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            priceAtOrder: (item as any).priceAtOrder || 0,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
    return order;
  }

  /**
   * Updates Order Status
   *
   * Changes the status of an order. Status transitions should be
   * validated in the service layer according to business rules.
   *
   * @param id - Order identifier
   * @param status - New order status
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated order
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    tx?: PrismaTransaction,
  ): Promise<Order> {
    const client = tx || getPrismaClient();
    return client.order.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Cancels an Order
   *
   * Sets order status to cancelled. Stock reversion and other
   * cleanup operations are handled in the service layer.
   *
   * @param id - Order identifier
   * @param tx - Optional transaction client for atomic operations
   * @returns Cancelled order
   */
  async cancel(id: string, tx?: PrismaTransaction): Promise<Order> {
    return this.updateStatus(id, OrderStatus.CANCELLED, tx);
  }

  /**
   * Updates Order Total Amount
   *
   * Updates the total amount after calculation in service layer.
   * Amount includes all items, taxes, tips, and discounts.
   *
   * @param id - Order identifier
   * @param totalAmount - Calculated total amount
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated Order
   */
  async updateTotal(
    id: string,
    totalAmount: number,
    tx?: PrismaTransaction,
  ): Promise<Order> {
    const client = tx || getPrismaClient();
    return client.order.update({
      where: { id },
      data: { totalAmount },
    });
  }
}

export default new OrderRepository();
