import { Order, OrderItem, OrderItemStatus } from "@prisma/client";
import {
  PaginatedResponse,
  PaginationParams,
} from "../../../interfaces/pagination.interfaces";
import {
  OrderWithItems,
  OrderWithRelations,
} from "../../../types/prisma.types";
import { CreateOrderBodyInput, OrderSearchParams } from "../order.validator";

/**
 * Order Repository Interface
 *
 * Defines the contract for order data access operations.
 * All order repository implementations must follow this Interface
 * to ensure consistency and enable dependency injection.
 */
export interface OrderRepositoryInterface {
  /**
   * Retrieves a paginated list of orders with optional filtering
   *
   * @param params - Pagination and filter parameters
   * @returns Paginated list of orders with items
   */
  findAll(
    params: PaginationParams & OrderSearchParams,
  ): Promise<PaginatedResponse<OrderWithItems>>;

  /**
   * Retrieves a specific order by ID with all relations
   *
   * @params id - Order identifier (UUID)
   * @returns Complete order with items, table, waiter, customer, or null.
   */
  findById(id: string): Promise<OrderWithRelations | null>;

  /**
   * Creates a new order with items in a transaction
   *
   * @param waiterId - Waiter identifier
   * @param data - Order creation data including items
   * @param tx - Optional transaction client for atomic operations
   * @returns Created order with items
   */
  create(
    waiterId: string,
    data: CreateOrderBodyInput,
    tx?: import("../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<OrderWithItems>;

  /**
   * Updates order status
   *
   * @param id - Order identifier
   * @param status - New order status
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated order
   */
  updateStatus(
    id: string,
    status: string,
    tx?: import("../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<Order>;

  /**
   * Cancels an order (soft delete by changing status)
   *
   * @param id - Order identifier
   * @param tx - Optional transaction client for atomic operations
   * @returns Cancelled order
   */
  cancel(
    id: string,
    tx?: import("../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<Order>;

  /**
   * Updates order total amount
   *
   * @param id - Order identifier
   * @param totalAmount - New total amount
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated order
   */
  updateTotal(
    id: string,
    totalAmount: number,
    tx?: import("../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<Order>;
  /**
   * Updates the status of an order item
   *
   * @param orderId - Order identifier
   * @param itemId - Item identifier
   * @param status - New item status
   * @param tx - Optional transaction client
   * @returns Updated order item
   */
  updateItemStatus(
    orderId: string,
    itemId: number,
    status: OrderItemStatus,
    tx?: import("../../../types/prisma-transaction.types").PrismaTransaction,
  ): Promise<OrderItem>;
}
