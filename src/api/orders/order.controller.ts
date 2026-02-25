import { Request, Response } from "express";
import { AuthenticatedUser } from "../../types/express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { OrderServiceInterface } from "./interfaces/order.service.interface";
import orderService from "./order.service";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  PaginationParams,
} from "../../interfaces/pagination.interfaces";
import {
  CreateOrderBodyInput,
  OrderSearchParams,
  UpdateOrderStatusBodyInput,
  BatchCreateOrderBodyInput,
} from "./order.validator";
import { OrderStatus, OrderType } from "../../types/prisma.types";

class OrderController {
  constructor(private orderService: OrderServiceInterface) {}
  /**
   * GET /orders
   *
   * Retrieves paginated list of orders with optional filtering.
   * This endpoint supports multiple filter criteria for flexible
   * order management and reporting.
   *
   * @param req - Express request object with query parameters
   * @param res - Express response object
   *
   * Query Parameter:
   * - page: Page number (optional, default: 1)
   * - limit: Records per page (optional, default: 20, max: 100)
   * - status: Filter by type (optional)
   * - type: Filter by type (optional )
   * - waiterId: Filter by waiter (optional)
   * - tableId: Filter by table (optional)
   * - date: Filter by date (optional)
   *
   * Response:
   * - 200: Orders retrieved successfully with pagination metadata
   * - 400: Invalid query parameters
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 500: Server error during retrieval
   */
  getOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_LIMIT;

    const searchParams: OrderSearchParams = {
      status: req.query.status as OrderStatus,
      type: req.query.type as OrderType,
      waiterId: req.query.waiterId as string,
      tableId: req.query.tableId ? Number(req.query.tableId) : undefined,
      date: req.query.date ? new Date(req.query.date as string) : undefined,
    };

    const params: PaginationParams & OrderSearchParams = {
      page,
      limit,
      ...searchParams,
    };

    const orders = await this.orderService.findAllOrders(params);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders.data,
      meta: orders.meta,
    });
  });

  /**
   * GET /orders/:id
   *
   * Retrieves detailed information about a specific order.
   * This endpoint provides complete order details including items,
   * table, waiter, customer, and payment information.
   *
   * @param req - Express request object with order ID in params
   * @returns res - Express response object
   *
   * URL Parameters:
   * - id: Order identifier (UUID, required)
   *
   * Response:
   * - 200: Order details retrieved successfully
   * - 400: Invalid order ID format
   * - 401: User not authenticated
   * - 403: User lacks permission to view this order
   * - 404: Order not Found
   * - 500: Server error during retrieval
   */
  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    const order = await this.orderService.findOrderById(id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  });

  /**
   * POST /orders
   *
   * Creates a new order with items and automatic stock management.
   * This is the primary endpoint for order creation across all channels.
   *
   * @param req - Express request object with order data in body
   * @param res - Express response object
   *
   * Request Body:
   * - waiterId: Waiter ID (UUID, required)
   * - tableId: Table ID (number, optional)
   * - customerId: Customer ID (UUID, optional)
   * - type: Order type (DINE_IN | TAKE_OUT | DELIVERY | WHATSAPP, required)
   * - items: Array of order items (required, min 1)
   *   - menuItemId: Menu item ID (number, required)
   *   - quantity: Quantity (number, required, min 1)
   *   - notes: Special instructions (string, optional)
   * - notes: Order notes (string, optional)
   * - whasappOrderId: WhatsApp order ID (string, optional)
   *
   * Response:
   * - 201: Order created successfully
   * - 400: Validation errors or insufficient stock
   * - 401: User not authenticated
   * - 403: User lacks permission to create orders
   * - 404: Menu item not found
   * - 500: Server error during creation
   *
   * Automatic Operations:
   * - Price captured from current menu item prices
   * - Total amount calculated autmatically
   * - Stock validated for all TRACKED items
   * - Stock deducted for all TRACKED items
   * - Audit trail created for stock changes
   */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    const data: CreateOrderBodyInput = req.body;
    const id = (req.user as AuthenticatedUser).id;

    const newOrder = await this.orderService.createOrder(id, data);

    res.status(HttpStatus.OK).json({
      success: true,
      message: `Order with ID ${newOrder.id} created successfully`,
      data: newOrder,
    });
  });

  /**
   * PATCH /orders/:id/status
   *
   * Updates the status of an order through the workflow.
   * This endpoint enforces status transition rules and triggers
   * appropiate side effects.
   *
   * @param req - Express request object with order ID and new status
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Order identifier (UUID, required)
   *
   * Request Body:
   * - status: New order status (required)
   *
   * Valid Statuses:
   * - PENDING: Order created
   * - SENT_TO_CASHIER: Sent to cashier for payment
   * - PAID: Payment confirmed
   * - IN_KITCHEN: Being prepared
   * - READY: Ready for pickup/delivery
   * - DELIVERED: Delivered to customer
   * - CANCELLED: Order cancelled
   *
   * Response:
   * - 200: Status updated successfully
   * - 400: Invalid status or transtition
   * - 401: User not authenticated
   * - 403: User lacks permission for this status change
   * - 404: Order not found
   * - 500: Server error during update
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const status: UpdateOrderStatusBodyInput = req.body;

    const order = await this.orderService.updateOrderStatus(id, status);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  });

  /**
   * DELETE /orders/:id
   *
   * Cancels an order and automatically reverts stock.
   * This endpoint handles order cancellation with full cleanup.
   *
   * @param req - Express request object with order ID in params
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Order identifier (UUID, required)
   *
   * Response:
   * - 200: Order cancelled successfully
   * - 400: Cannot cancel this order (already delivered/cancelled)
   * - 401: User not authenticated
   * - 403: User lacks permission to cancel orders
   * - 404: Order not found
   * - 500: Server error during cancellation
   *
   * Automatic Operations:
   * - Order status changed to CANCELLED
   * - Stock reverted for all TRACKED items
   * - Audit trail created for stock changes
   * - Order preserved in database (soft delete)
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    const order = await this.orderService.cancelOrder(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: `Order with ID ${id} has been CANCELLED`,
      data: order,
    });
  });

  /**
   * POST /orders/batch
   *
   * Creates multiple orders in a single atomic transaction.
   * Used for setLunch orders where multiple diners at the same table
   * create separate orders simultaneously.
   *
   * @param req - Express request object with batch order data in body
   * @param res - Express response object
   *
   * Request Body:
   * - tableId: Table ID (number, required)
   * - orders: Array of orders to create (required, min 1, max 10)
   *   - type: Order type (DINE_IN | TAKE_OUT | DELIVERY | WHATSAPP, required)
   *   - customerId: Customer ID (UUID, optional)
   *   - items: Array of order items (required, min 1)
   *     - menuItemId: Menu item ID (number, required)
   *     - quantity: Quantity (number, required, min 1)
   *     - notes: Special instructions (string, optional)
   *     - isSubstitution: Whether this is a substitution (boolean, optional)
   *     - originalItemId: Original item ID if substitution (number, optional)
   *     - isExtra: Whether this is a paid extra (boolean, optional)
   *   - notes: Order notes (string, optional)
   *
   * Response:
   * - 201: Orders created successfully
   * - 400: Validation errors or insufficient stock
   * - 401: User not authenticated
   * - 403: User lacks permission to create orders
   * - 404: Menu item or table not found
   * - 500: Server error during creation
   *
   * Business Logic:
   * - All orders created atomically (all succeed or all fail)
   * - Combo pricing applied for setLunch orders
   * - Stock validated for all items across all orders
   * - Stock deducted for all TRACKED items
   * - Returns table total for easy billing
   */
  batchCreateOrders = asyncHandler(async (req: Request, res: Response) => {
    const data: BatchCreateOrderBodyInput = req.body;
    const waiterId = (req.user as AuthenticatedUser).id;

    const result = await this.orderService.batchCreateOrders(waiterId, data);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: `${result.orders.length} orders created successfully`,
      data: {
        createdOrders: result.orders,
        tableTotal: result.tableTotal,
      },
    });
  });
}

export default new OrderController(orderService);
