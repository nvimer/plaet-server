import { Router } from "express";
import {
  createOrderSchema,
  orderIdSchema,
  orderSearchSchema,
  updateOrderStatusSchema,
  updateOrderItemStatusSchema,
  batchCreateOrderSchema,
} from "./order.validator";
import orderController from "./order.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authJwt } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);

/**
 * GET /orders
 * Retrieves paginated list of orders with optional filtering.
 */
router.get(
  "/",
  permissionMiddleware("orders:read"),
  validate(orderSearchSchema),
  orderController.getOrders,
);

/**
 * GET /orders/:id
 * Retrieves detailed information about a specific order
 */
router.get(
  "/:id",
  permissionMiddleware("orders:read"),
  validate(orderIdSchema),
  orderController.getOrder,
);

/**
 * POST /orders
 * Creates a new order with items and stock management
 */
router.post(
  "/",
  permissionMiddleware("orders:create"),
  validate(createOrderSchema),
  orderController.createOrder,
);

/**
 * POST /orders/batch
 * Creates multiple orders in a single atomic transaction.
 */
router.post(
  "/batch",
  permissionMiddleware("orders:create"),
  validate(batchCreateOrderSchema),
  orderController.batchCreateOrders,
);

/**
 * PATCH /orders/:id/status
 * Updates order status through workflow.
 */
router.patch(
  "/:id/status",
  permissionMiddleware("orders:update"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

/**
 * DELETE /orders/:id
 * Cancels order and reverts stock
 */
router.delete(
  "/:id",
  permissionMiddleware("orders:cancel"),
  validate(orderIdSchema),
  orderController.cancelOrder,
);

/**
 * PATCH /orders/:id/items/:itemId/status
 * Updates the status of an individual item.
 */
router.patch(
  "/:id/items/:itemId/status",
  permissionMiddleware("orders:update"),
  validate(updateOrderItemStatusSchema),
  orderController.updateOrderItemStatus,
);

export default router;
