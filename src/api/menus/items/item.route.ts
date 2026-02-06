import { Router } from "express";
import itemController from "./item.controller";
import { validate } from "../../../middlewares/validation.middleware";
import {
  addStockSchema,
  createItemSchema,
  dailyStockResetSchema,
  inventoryTypeSchema,
  menuItemIdSchema,
  menuItemSearchSchema,
  removeStockSchema,
  stockHistorySchema,
  corrientazoFilterSchema,
} from "./item.validator";
import { paginationQuerySchema } from "../../../utils/pagination.schema";
import { authJwt } from "../../../middlewares/auth.middleware";

const router = Router();

/**
 * GET /items
 * Retrieves a paginated list of all Menu-Items in the system.
 * This endpoint supports pagination parameters for efficient
 * data retrieval and display
 */
router.get("/", validate(paginationQuerySchema), itemController.getMenuItems);

/*
 * GET /items/search
 * Searches for menu items with optional filtering and pagination.
 */
router.get(
  "/search",
  validate(menuItemSearchSchema),
  validate(paginationQuerySchema),
  itemController.searchMenuItems,
);

/**
 * GET /items/corrientazo
 * Retrieves menu items filtered by corrientazo-specific criteria.
 * Used for corrientazo (set lunch) order creation.
 */
router.get(
  "/corrientazo",
  validate(corrientazoFilterSchema),
  validate(paginationQuerySchema),
  itemController.getCorrientazoItems,
);

/**
 * POST /items
 * Creates a new menu item in the system with the provided information.
 * This endpoint handles menu item creation with comprehensive validation
 * and ensures proper data structure and business rules.
 */
router.post("/", validate(createItemSchema), itemController.postItem);

/**
 * POST /items/stock/daily-reset
 * Register a initial stock of the day. The system creates a new stock every day with
 * value provided for admin
 */
router.post(
  "/stock/daily-reset",
  validate(dailyStockResetSchema),
  itemController.dailyStockReset,
);

/**
 * GET /items/low-stock
 * Retrieves a list of items with low stock.
 */
router.get("/low-stock", authJwt, itemController.getLowStock);

/**
 * GET /items/out-of-stock
 * Retrieves a list of items without stock.
 */
router.get("/out-of-stock", authJwt, itemController.getOutOfStock);

/**
 * GET /items/:id
 * Retrieves a specific menu item by its ID
 */
router.get("/:id", validate(menuItemIdSchema), itemController.getMenuItem);

/**
 * POST /items/:id/stock/add
 * Creates a new daily stock. This operation only has been manage for admin user. This user
 * update every day of items.
 */
router.post(
  "/:id/stock/add",
  authJwt,
  validate(addStockSchema),
  itemController.addStock,
);

/**
 * POST /items/:id/stock/remove
 * Remove stock manually.
 * This operation can be restore stock of item by id.
 */
router.post(
  "/:id/stock/remove",
  authJwt,
  validate(removeStockSchema),
  itemController.removeStock,
);

/**
 * GET /items/:id/stock/history
 * Get a adjusment history of a item by his id.
 */
router.get(
  "/:id/stock/history",
  validate(stockHistorySchema),
  itemController.getStockHistory,
);

/**
 * PATCH /items/:id/inventory-type
 * Configure inventory type of item by id
 */
router.patch(
  "/:id/inventory-type",
  validate(inventoryTypeSchema),
  itemController.setInventoryType,
);

export default router;
