import { z } from "zod";
import { idParamsSchema } from "../../../utils/params.schema";
import { InventoryType } from "../../../types/prisma.types";

const inventoryType = z.enum(
  Object.values(InventoryType) as [InventoryType, ...InventoryType[]],
);

/**
 * Validation Schema for Menu Item ID Parameters
 *
 * Validates the ID parameter in URL paths for menu item operations.
 * This schema ensures the ID is a valid integer format before processing.
 */
export const menuItemIdSchema = z.object({
  params: idParamsSchema,
});

/**
 * Menu item creation validation schema
 *
 * Validates the request body for menu item creation operations.
 * This schema ensures all required fields are present and meet
 * the specified validation criteria for creating new menu items.
 */
export const createItemSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name cannot exceed 50 characters"),
    description: z.string().optional().or(z.literal("")),
    categoryId: z.coerce
      .number()
      .int()
      .positive("Category ID must be a positive number"),
    price: z.coerce.number().positive("Price must be positive"),
    isAvailable: z.boolean().optional().default(true),
    imageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
    // Inventory management fields
    inventoryType: z
      .nativeEnum(InventoryType)
      .optional()
      .default(InventoryType.UNLIMITED),
    initialStock: z.coerce.number().int().min(0).optional(),
    lowStockAlert: z.coerce.number().int().min(0).optional(),
    autoMarkUnavailable: z.boolean().optional().default(true),
  }),
});

/**
 * Validation Schema for Menu Item Search Parameters
 *
 * Validates query parameters for menu item search and filtering operations.
 * Supports text-based search and boolean status filtering with proper
 * sanitization and type transformation.
 */
export const menuItemSearchSchema = z.object({
  query: z.object({
    search: z
      .string()
      .min(1, "Search term must be at least 1 character")
      .max(100, "Search term cannot exceed 100 characters")
      .trim()
      .optional(),
    active: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
  }),
});

/**
 * Validation Schema for SetLunch Menu Item Filters
 *
 * Validates query parameters for filtering menu items by setLunch-specific fields.
 * Supports filtering by protein status, plate component status, and component type.
 */
export const setLunchFilterSchema = z.object({
  query: z.object({
    isProtein: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    isPlateComponent: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    componentType: z
      .enum(["soup", "principle", "salad", "additional"])
      .optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
  }),
});

/**
 * Validation Schema for Daily Stock Reset Operation
 *
 * Validates the request body for daily stock initialization.
 * This operation is typically performed at the start of each business day
 * to set the initial stock quantities for pre-prepared dishes.
 */
export const dailyStockResetSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          itemId: z.number().int().positive("Item ID must be positive"),
          quantity: z.number().int().min(0, "Quantity must be 0 or greater"),
          lowStockAlert: z.number().int().min(0).optional(),
        }),
      )
      .min(1, "At least one item must be provided"),
  }),
});

/**
 * Validation Schema for Manual Stock Addition
 *
 * Validates requests to manually add stock to a menu item.
 * This operation is used for mid-day stock additions, such as
 * additional production runs or inventory corrections.
 */
export const addStockSchema = z.object({
  params: idParamsSchema,
  body: z.object({
    quantity: z.number().int().positive("Quantity must be positive"),
    reason: z.string().min(3, "Reason must be at least 3 characters"),
  }),
});

/**
 * Validation Schema for Manual Stock Removal
 *
 * Validates requests to manually remove stock from a menu item.
 * This operation is used for spoilage, damage, waste, or other
 * reductions that occur outside of normal order fulfillment.
 */
export const removeStockSchema = z.object({
  params: idParamsSchema,
  body: z.object({
    quantity: z.number().int().positive("Quantity must be positive"),
    reason: z
      .string()
      .min(3, "Reason must be at least 3 characters")
      .optional(),
  }),
});

/**
 * Validation Schema for Inventory Type Configuration
 *
 * Validates requests to configure or change the inventory tracking
 * type for a menu item. This determines whether the item requires
 * stock tracking or has unlimited availability.
 */
export const inventoryTypeSchema = z.object({
  params: idParamsSchema,
  body: z.object({
    inventoryType: inventoryType,
    lowStockAlert: z.number().int().min(0).optional(),
  }),
});

/**
 * Validation Schema for Stock History Query Parameters
 *
 * Validates query parameters for retrieving the stock adjustment
 * history of a specific menu item. Supports pagination for efficient
 * data retrieval and display of historical stock movements.
 */
export const stockHistorySchema = z.object({
  params: idParamsSchema,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type MenuItemIdParams = z.infer<typeof menuItemIdSchema>["params"];
export type CreateItemInput = z.infer<typeof createItemSchema>["body"];
export type MenuItemSearchParams = z.infer<
  typeof menuItemSearchSchema
>["query"];
export type DailyStockResetInput = z.infer<
  typeof dailyStockResetSchema
>["body"];
export type AddStockInput = z.infer<typeof addStockSchema>;
export type AddStockBodyInput = z.infer<typeof addStockSchema>["body"];
export type RemoveStockInput = z.infer<typeof removeStockSchema>;
export type RemoveStockBodyInput = z.infer<typeof removeStockSchema>["body"];
export type InventoryTypeInput = z.infer<typeof inventoryTypeSchema>["body"];
export type StockHistoryParams = z.infer<typeof stockHistorySchema>["query"];
export type SetLunchFilterParams = z.infer<
  typeof setLunchFilterSchema
>["query"];

/**
 * Validation Schema for Menu Item Update
 *
 * Validates the request body for updating menu item information.
 * All fields are optional to allow partial updates.
 */
export const updateItemSchema = z.object({
  params: idParamsSchema,
  body: z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name cannot exceed 50 characters")
      .optional(),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    price: z.coerce.number().positive("Price must be positive").optional(),
    isAvailable: z.boolean().optional(),
    imageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
    inventoryType: z.nativeEnum(InventoryType).optional(),
    initialStock: z.coerce.number().int().min(0).optional(),
    lowStockAlert: z.coerce.number().int().min(0).optional(),
    autoMarkUnavailable: z.boolean().optional(),
  }),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>["body"];

/**
 * Validation Schema for Bulk Stock Update
 *
 * Validates request body for updating stock for multiple items at once.
 */
export const bulkStockUpdateSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          menuItemId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().int().min(1),
          adjustmentType: z.enum(["MANUAL_ADD", "MANUAL_REMOVE"]),
          reason: z.string().optional(),
        }),
      )
      .min(1, "At least one item must be provided"),
  }),
});

/**
 * Validation Schema for Inventory Report Parameters
 */
export const inventoryReportSchema = z.object({
  query: z.object({
    categoryId: z.coerce.number().int().positive().optional(),
    inventoryType: z.nativeEnum(InventoryType).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    includeOutOfStock: z.coerce.boolean().default(true),
    includeLowStock: z.coerce.boolean().default(true),
  }),
});

/**
 * Validation Schema for Bulk Inventory Type Change
 */
export const bulkInventoryTypeSchema = z.object({
  body: z.object({
    menuItemIds: z.array(z.coerce.number().int().positive()).min(1),
    inventoryType: z.nativeEnum(InventoryType),
    initialStock: z.coerce.number().int().min(0).optional(),
    lowStockAlert: z.coerce.number().int().min(1).optional(),
  }),
});

export type BulkStockUpdateInput = z.infer<
  typeof bulkStockUpdateSchema
>["body"];
export type InventoryReportParams = z.infer<
  typeof inventoryReportSchema
>["query"];
export type BulkInventoryTypeInput = z.infer<
  typeof bulkInventoryTypeSchema
>["body"];
