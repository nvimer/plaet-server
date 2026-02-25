import { Router } from "express";
import itemController from "./item.controller";
import { validate } from "../../../middlewares/validation.middleware";
import {
  addStockSchema,
  bulkInventoryTypeSchema,
  bulkStockUpdateSchema,
  createItemSchema,
  dailyStockResetSchema,
  inventoryReportSchema,
  inventoryTypeSchema,
  menuItemIdSchema,
  menuItemSearchSchema,
  removeStockSchema,
  setLunchFilterSchema,
  stockHistorySchema,
  updateItemSchema,
} from "./item.validator";
import { paginationQuerySchema } from "../../../utils/pagination.schema";
import { authJwt } from "../../../middlewares/auth.middleware";
import { uploadSingle } from "../../../middlewares/upload.middleware";
import { permissionMiddleware } from "../../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);

/**
 * GET /items
 */
router.get(
  "/", 
  permissionMiddleware("menu:read"), 
  validate(paginationQuerySchema), 
  itemController.getMenuItems
);

/*
 * GET /items/search
 */
router.get(
  "/search",
  permissionMiddleware("menu:read"),
  validate(menuItemSearchSchema),
  validate(paginationQuerySchema),
  itemController.searchMenuItems,
);

/**
 * GET /items/set-lunch
 */
router.get(
  "/set-lunch",
  permissionMiddleware("menu:read"),
  validate(setLunchFilterSchema),
  validate(paginationQuerySchema),
  itemController.getSetLunchItems,
);

/**
 * POST /items
 */
router.post(
  "/",
  permissionMiddleware("menu:manage"),
  uploadSingle("image"),
  validate(createItemSchema),
  itemController.postItem,
);

/**
 * POST /items/stock/daily-reset
 */
router.post(
  "/stock/daily-reset",
  permissionMiddleware("stock:manage"),
  validate(dailyStockResetSchema),
  itemController.dailyStockReset,
);

/**
 * GET /items/low-stock
 */
router.get(
  "/low-stock", 
  permissionMiddleware("stock:manage"), 
  itemController.getLowStock
);

/**
 * GET /items/out-of-stock
 */
router.get(
  "/out-of-stock", 
  permissionMiddleware("stock:manage"), 
  itemController.getOutOfStock
);

/**
 * GET /items/by-category/:categoryId
 */
router.get(
  "/by-category/:categoryId", 
  permissionMiddleware("menu:read"), 
  itemController.getItemsByCategory
);

/**
 * GET /items/:id
 */
router.get(
  "/:id", 
  permissionMiddleware("menu:read"), 
  validate(menuItemIdSchema), 
  itemController.getMenuItem
);

/**
 * POST /items/:id/stock/add
 */
router.post(
  "/:id/stock/add",
  permissionMiddleware("stock:manage"),
  validate(addStockSchema),
  itemController.addStock,
);

/**
 * POST /items/:id/stock/remove
 */
router.post(
  "/:id/stock/remove",
  permissionMiddleware("stock:manage"),
  validate(removeStockSchema),
  itemController.removeStock,
);

/**
 * GET /items/:id/stock/history
 */
router.get(
  "/:id/stock/history",
  permissionMiddleware("stock:manage"),
  validate(stockHistorySchema),
  itemController.getStockHistory,
);

/**
 * PATCH /items/:id/inventory-type
 */
router.patch(
  "/:id/inventory-type",
  permissionMiddleware("stock:manage"),
  validate(inventoryTypeSchema),
  itemController.setInventoryType,
);

/**
 * POST /items/bulk-stock-update
 */
router.post(
  "/bulk-stock-update",
  permissionMiddleware("stock:manage"),
  validate(bulkStockUpdateSchema),
  itemController.bulkStockUpdate,
);

/**
 * POST /items/bulk-inventory-type
 */
router.post(
  "/bulk-inventory-type",
  permissionMiddleware("stock:manage"),
  validate(bulkInventoryTypeSchema),
  itemController.bulkInventoryTypeUpdate,
);

/**
 * GET /items/inventory-report
 */
router.get(
  "/inventory-report",
  permissionMiddleware("stock:manage"),
  validate(inventoryReportSchema),
  itemController.getInventoryReport,
);

/**
 * GET /items/stock-summary
 */
router.get(
  "/stock-summary", 
  permissionMiddleware("stock:manage"), 
  itemController.getStockSummary
);

/**
 * PATCH /items/:id
 */
router.patch(
  "/:id",
  permissionMiddleware("menu:manage"),
  uploadSingle("image"),
  validate(updateItemSchema),
  itemController.patchItem,
);


/**
 * DELETE /items/:id
 */
router.delete(
  "/:id",
  permissionMiddleware("menu:manage"),
  validate(menuItemIdSchema),
  itemController.deleteItem,
);

export default router;
