import { Order, OrderItem, OrderItemStatus } from "@prisma/client";
import { CustomError } from "../../../types/custom-errors";
import {
  InventoryType,
  OrderStatus,
  OrderWithRelations,
} from "../../../types/prisma.types";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import { ItemServiceInterface } from "../../menus/items/interfaces/item.service.interface";
import { OrderRepositoryInterface } from "../interfaces/order.repository.interface";
import { UpdateOrderStatusBodyInput } from "../order.validator";
import { getPrismaClient } from "../../../database/prisma";
import { PrismaTransaction } from "../../../types/prisma-transaction.types";

export class OrderStatusService {
  constructor(
    private orderRepository: OrderRepositoryInterface,
    private itemService: Pick<ItemServiceInterface, "revertStockForOrder">,
    private findOrderByIdOrFail: (id: string) => Promise<OrderWithRelations>,
  ) {}

  /**
   * Updates Order Status
   */
  async updateOrderStatus(
    id: string,
    data: UpdateOrderStatusBodyInput,
  ): Promise<Order> {
    const order = await this.findOrderByIdOrFail(id);

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

    const client = getPrismaClient();
    return client.order.update({
      where: { id },
      data: { status: data.status },
    });
  }

  /**
   * Cancels Order and Reverts Stock
   */
  async cancelOrder(id: string): Promise<Order> {
    const order = await this.findOrderByIdOrFail(id);

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

    const client = getPrismaClient();
    return await client.$transaction(async (tx: PrismaTransaction) => {
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

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }

  /**
   * Updates the status of an individual order item
   */
  async updateOrderItemStatus(
    orderId: string,
    itemId: number,
    status: OrderItemStatus,
  ): Promise<OrderItem> {
    const order = await this.findOrderByIdOrFail(orderId);

    if (order.status !== OrderStatus.PAID) {
      throw new CustomError(
        "Debes pagar completamente el pedido antes de enviarlo a cocina",
        HttpStatus.BAD_REQUEST,
        "ORDER_NOT_FULLY_PAID",
      );
    }

    return await this.orderRepository.updateItemStatus(orderId, itemId, status);
  }
}
