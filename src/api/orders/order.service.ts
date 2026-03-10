import { Order, OrderItem, Prisma, OrderItemStatus } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { CustomError } from "../../types/custom-errors";
import {
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
} from "./order.validator";
import orderRepository from "./order.repository";
import itemService from "../menus/items/item.service";
import { getPrismaClient } from "../../database/prisma";
import { createPaginatedResponse } from "../../utils/pagination.helper";
import { dateUtils } from "../../utils/date.utils";
import { OrderCreationService } from "./services/order-creation.service";
import { OrderStatusService } from "./services/order-status.service";

export class OrderService implements OrderServiceInterface {
  private creationService: OrderCreationService;
  private statusService: OrderStatusService;

  constructor(
    private orderRepository: OrderRepositoryInterface,
    private itemService: Pick<
      ItemServiceInterface,
      "findMenuItemById" | "deductStockForOrder" | "revertStockForOrder"
    >,
  ) {
    this.creationService = new OrderCreationService(
      this.orderRepository,
      this.itemService,
    );
    this.statusService = new OrderStatusService(
      this.orderRepository,
      this.itemService,
      this.findOrderByIdOrFail.bind(this),
    );
  }

  /**
   * Private Helper: Find Order by ID or Fail
   */
  private async findOrderByIdOrFail(id: string): Promise<OrderWithRelations> {
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
   */
  async findAllOrders(
    params: PaginationParams & OrderSearchParams,
  ): Promise<PaginatedResponse<OrderWithItems>> {
    const client = getPrismaClient();
    const { page, limit, status, type, waiterId, tableId, date } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (waiterId) where.waiterId = waiterId;
    if (tableId) where.tableId = tableId;
    if (date) {
      const { start, end } = dateUtils.getDayRange(date);
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      client.order.findMany({
        where,
        include: {
          items: { include: { menuItem: true } },
          table: true,
          payments: true,
          waiter: {
            select: { id: true, firstName: true, lastName: true },
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
   */
  async findOrderById(id: string): Promise<OrderWithRelations> {
    return await this.findOrderByIdOrFail(id);
  }

  /**
   * Creates New Order with Stock Validation and Deduction
   */
  async createOrder(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: CreateOrderBodyInput,
  ): Promise<OrderWithItems> {
    return this.creationService.createOrder(waiterId, restaurantId, data);
  }

  /**
   * Updates Order Status with Validation
   */
  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusBodyInput,
  ): Promise<Order> {
    return this.statusService.updateOrderStatus(id, data);
  }

  /**
   * Cancels Order and Reverts Stock
   */
  async cancelOrder(id: string): Promise<Order> {
    return this.statusService.cancelOrder(id);
  }

  /**
   * Creates Multiple Orders in a Single Transaction (Batch Order Creation)
   */
  async batchCreateOrders(
    waiterId: string,
    restaurantId: string | null | undefined,
    data: BatchCreateOrderBodyInput,
  ): Promise<{ orders: OrderWithItems[]; tableTotal: number }> {
    return this.creationService.batchCreateOrders(waiterId, restaurantId, data);
  }

  /**
   * Updates the status of an individual order item
   */
  async updateOrderItemStatus(
    orderId: string,
    itemId: number,
    status: OrderItemStatus,
  ): Promise<OrderItem> {
    return this.statusService.updateOrderItemStatus(orderId, itemId, status);
  }
}

export default new OrderService(orderRepository, itemService);
