import { Router } from "express";
import {
  createOrderSchema,
  orderIdSchema,
  orderSearchSchema,
  updateOrderStatusSchema,
  batchCreateOrderSchema,
} from "./order.validator";
import orderController from "./order.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authJwt } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authJwt);

/**
 * GET /orders
 * Retrieves paginated list of orders with optional filtering.
 */
router.get("/", validate(orderSearchSchema), orderController.getOrders);

/**
 * GET /orders/:id
 * Retrieves detailed information about a specific order
 */
router.get("/:id", validate(orderIdSchema), orderController.getOrder);

/**
 * POST /orders
 * Creates a new order with items and stock management
 */
router.post("/", validate(createOrderSchema), orderController.createOrder);

/**
 * POST /orders/batch
 * Creates multiple orders in a single atomic transaction.
 * Used for corrientazo orders where multiple diners at the same table
 * create separate orders simultaneously.
 */
router.post(
  "/batch",
  validate(batchCreateOrderSchema),
  orderController.batchCreateOrders,
);

/**
 * PATCH /orders/:id/status
 * Updates order status through workflow.
 */
router.patch(
  "/:id/status",
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

/**
 * DELETE /orders/:id
 * Cancels order and reverts stock
 */
router.delete("/:id", validate(orderIdSchema), orderController.cancelOrder);

export default router;
