import { Order } from "@prisma/client";
import {
  PaginatedResponse,
  PaginationParams,
} from "../../../interfaces/pagination.interfaces";
import {
  OrderWithItems,
  OrderWithRelations,
} from "../../../types/prisma.types";
import {
  CreateOrderBodyInput,
  OrderSearchParams,
  UpdateOrderStatusBodyInput,
  BatchCreateOrderBodyInput,
} from "../order.validator";

/**
 * Order Service Interface
 *
 * Defines the contract for order business logic operations.
 * All order service implementations must follow this Interface
 * to ensure consistency and enable dependency injection.
 */
export interface OrderServiceInterface {
  /**
   * Retrieves paginated list of orders with filtering
   *
   * @param params - Pagination and filter parameters
   * @results Paginated list of orders
   */
  findAllOrders(
    params: PaginationParams & OrderSearchParams,
  ): Promise<PaginatedResponse<OrderWithItems>>;

  /**
   * Retrieves specific order by ID
   *
   * @param id - Order identifier
   * @results Complete order with relations
   * @throws CustomError if order not found
   */
  findOrderById(id: string): Promise<OrderWithRelations>;

  /**
   * Creates new order with stock validation and deduction
   *
   * @param data - Order creation data
   * @return Created order with items
   * @throws Custom Error if validation fails or insufficient stock
   */
  createOrder(id: string, data: CreateOrderBodyInput): Promise<OrderWithItems>;

  /**
   * Updates order status with validation
   *
   * @param id - Order identifier
   * @param data - Status update data
   * @returns Updated order
   * @throws CustomError if status transition invalid;
   */
  updateOrderStatus(
    id: string,
    data: UpdateOrderStatusBodyInput,
  ): Promise<Order>;

  /**
   * Cancels order and reverts stock
   *
   * @param id - Order identifier
   * @returns Cancelled order
   * @throws CustomError if order cannot be cancelled;
   */
  cancelOrder(id: string): Promise<Order>;

  /**
   * Creates multiple orders in a single transaction (batch creation)
   *
   * Used for corrientazo orders where multiple diners at the same table
   * create separate orders atomically.
   *
   * @param waiterId - Waiter creating the orders
   * @param data - Batch order data
   * @returns Created orders and table total
   * @throws CustomError if validation fails
   */
  batchCreateOrders(
    waiterId: string,
    data: BatchCreateOrderBodyInput,
  ): Promise<{ orders: OrderWithItems[]; tableTotal: number }>;
}
