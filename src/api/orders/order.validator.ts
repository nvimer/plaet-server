import { z } from "zod";
import { OrderStatus, OrderType } from "../../types/prisma.types";
import { idParamsSchema } from "../../utils/params.schema";

/**
 * Order Status Enum Validation
 *
 * Validates order status values to ensure only valid statuses
 * are accepted in API requests.
 */
const orderStatusEnum = z.enum(
  Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]],
);

/**
 * Order Type Enum Validation
 *
 * Validates order type to ensure proper classification.
 */
const orderTypeEnum = z.enum(
  Object.values(OrderType) as [OrderType, ...OrderType[]],
);

/**
 * Validation Schema for Order ID Parameters
 *
 * Validates the ID parameter in URL paths for order operations.
 * The ID is a UUID string.
 */
export const orderIdSchema = z.object({
  params: idParamsSchema,
});

/**
 * Validation Schema for Order Item Creation
 *
 * Validates individual items when creating an order.
 * Each item represents a menu item with quantity and optional notes.
 */
const orderItemSchema = z.object({
  menuItemId: z.number().int().positive("Menu item ID must be positive"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
  // SET_LUNCH SPECIFIC FIELDS
  isSubstitution: z.boolean().optional(),
  originalItemId: z.number().int().positive().optional(),
  isExtra: z.boolean().optional(),
  isFreeSubstitution: z.boolean().optional(),
});

/**
 * Validation Schema for Order Creation
 *
 * Validates the complete request body for creating a new order.
 * This is the main schema user when a waiter/POS creates an order.
 */
export const createOrderSchema = z.object({
  body: z.object({
    tableId: z.number().int().positive("Table ID must be positive").optional(),
    customerId: z.string().uuid("Customer ID must be a valid UUID").optional(),
    type: orderTypeEnum,
    items: z
      .array(orderItemSchema)
      .min(1, "Order must contain at least one item."),
    notes: z
      .string()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional(),
    whatsappOrderId: z
      .string()
      .max(100, "WhatsApp Order ID cannot exceed 100 characters")
      .optional(),
    createdAt: z.coerce.date().optional(),
  }),
});

/**
 * Validation Schema for Order Status Update
 *
 * Validates requests to updated order status.
 * Status updates must follow business logic and permissions
 */
export const updateOrderStatusSchema = z.object({
  params: idParamsSchema,
  body: z.object({
    status: orderStatusEnum,
  }),
});

/**
 * Validation Schema for Order Search/Filter Parameters
 *
 * Validates query parameters for searching and filtering orders.
 * Supports multiple filter criteria for flexible order management.
 */
export const orderSearchSchema = z.object({
  query: z.object({
    status: orderStatusEnum.optional(),
    type: orderTypeEnum.optional(),
    waiterId: z.string().uuid().optional(),
    tableId: z.coerce.number().int().positive().optional(),
    date: z.coerce.date().optional(),
  }),
});

/**
 * Validation Schema for Batch Order Creation
 *
 * Validates the request body for creating multiple orders at once.
 * Used for setLunch orders where multiple diners order at the same table.
 */
export const batchCreateOrderSchema = z.object({
  body: z.object({
    tableId: z.number().int().positive("Table ID must be positive"),
    orders: z
      .array(
        z.object({
          type: orderTypeEnum,
          customerId: z
            .string()
            .uuid("Customer ID must be a valid UUID")
            .optional(),
          items: z
            .array(orderItemSchema)
            .min(1, "Order must contain at least one item."),
          notes: z
            .string()
            .max(1000, "Notes cannot exceed 1000 characters")
            .optional(),
        }),
      )
      .min(1, "At least one order must be provided")
      .max(10, "Cannot create more than 10 orders at once"),
  }),
});

export type OrderIdParams = z.infer<typeof orderIdSchema>["params"];
export type CreateOrderBodyInput = z.infer<typeof createOrderSchema>["body"];
export type UpdateOrderStatusBodyInput = z.infer<
  typeof updateOrderStatusSchema
>["body"];
export type OrderSearchParams = z.infer<typeof orderSearchSchema>["query"];
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type BatchCreateOrderBodyInput = z.infer<
  typeof batchCreateOrderSchema
>["body"];
