import { Request, Response } from "express";
import { AuthenticatedUser } from "../../../types/express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { ItemServiceInterface } from "./interfaces/item.service.interface";
import {
  AddStockBodyInput,
  BulkInventoryTypeInput,
  BulkStockUpdateInput,
  CreateItemInput,
  DailyStockResetInput,
  InventoryReportParams,
  InventoryTypeInput,
  MenuItemSearchParams,
  UpdateItemInput,
} from "./item.validator";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import { InventoryType } from "../../../types/prisma.types";
import itemService from "./item.service";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  PaginationParams,
} from "../../../interfaces/pagination.interfaces";

/**
 * Menu Item Controller
 */
class ItemController {
  constructor(private itemService: ItemServiceInterface) {}

  /**
   * GET /menu-items
   */
  getMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const categoryId = req.query.categoryId as string | undefined;

    const params: PaginationParams = { page, limit, categoryId };
    const menuItems = await this.itemService.findAllMenuItems(params);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Items fetched successfully",
      data: menuItems.data,
      meta: menuItems.meta,
    });
  });

  /*
   * GET /menus/search
   */
  searchMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_LIMIT;
    const search = req.query.search as string;
    const active =
      req.query.active === "true"
        ? true
        : req.query.active === "false"
          ? false
          : undefined;
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;

    const params: PaginationParams & MenuItemSearchParams = {
      page,
      limit,
      search,
      active,
      categoryId,
    };

    const menuItems = await this.itemService.searchMenuItems(params);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Items search completed successfully",
      data: menuItems.data,
      meta: menuItems.meta,
    });
  });

  /**
   * GET /items/setLunch
   */
  getSetLunchItems = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_LIMIT;
    const isProtein =
      req.query.isProtein === "true"
        ? true
        : req.query.isProtein === "false"
          ? false
          : undefined;
    const isPlateComponent =
      req.query.isPlateComponent === "true"
        ? true
        : req.query.isPlateComponent === "false"
          ? false
          : undefined;
    const componentType = req.query.componentType as
      | "soup"
      | "principle"
      | "salad"
      | "additional"
      | undefined;
    const category = req.query.category as string | undefined;
    const minPrice = req.query.minPrice
      ? Number(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? Number(req.query.maxPrice)
      : undefined;

    const params = {
      page,
      limit,
      isProtein,
      isPlateComponent,
      componentType,
      category,
      minPrice,
      maxPrice,
    };

    const menuItems = await this.itemService.getSetLunchItems(params);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "SetLunch items retrieved successfully",
      data: menuItems.data,
      meta: menuItems.meta,
    });
  });

  /**
   * GET /items/:id
   */
  getMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const menuItem = await this.itemService.findMenuItemById(id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Item fetched successfully",
      data: menuItem,
    });
  });

  /**
   * GET /items/by-category/:categoryId
   */
  getItemsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = Number(req.params.categoryId);

    if (isNaN(categoryId) || categoryId <= 0) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid category ID format",
      });
      return;
    }

    const menuItems =
      await this.itemService.findMenuItemsByCategory(categoryId);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Category items retrieved successfully",
      data: menuItems,
    });
  });

  /**
   * POST /items
   */
  postItem = asyncHandler(async (req: Request, res: Response) => {
    const data: CreateItemInput = req.body;

    if (req.file) {
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
    }

    const item = await this.itemService.createItem(data);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Item created successfully",
      data: item,
    });
  });

  /**
   * POST /items/stock/daily-reset
   */
  dailyStockReset = asyncHandler(async (req: Request, res: Response) => {
    const data: DailyStockResetInput = req.body;
    await this.itemService.dailyStockReset(data);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Daily stock reset successfully",
    });
  });

  /**
   * POST /items/:id/stock/add
   */
  addStock = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: AddStockBodyInput = req.body;
    const user = req.user as AuthenticatedUser;
    const item = await this.itemService.addStock(id, data, user.id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock added successfully",
      data: item,
    });
  });

  /**
   * POST /items/:id/stock/remove
   */
  removeStock = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: AddStockBodyInput = req.body;
    const user = req.user as AuthenticatedUser;
    const item = await this.itemService.removeStock(id, data, user.id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock removed successfully",
      data: item,
    });
  });

  /**
   * GET /items/low-stock
   */
  getLowStock = asyncHandler(async (req: Request, res: Response) => {
    const items = await this.itemService.getLowStock();
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Low stock items fetched successfully",
      data: items,
    });
  });

  /**
   * GET /items/out-of-stock
   */
  getOutOfStock = asyncHandler(async (req: Request, res: Response) => {
    const items = await this.itemService.getOutStock();
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Out of stock items fetched successfully",
      data: items,
    });
  });

  /**
   * GET /items/:id/stock/history
   */
  getStockHistory = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const params: PaginationParams = { page, limit };
    const history = await this.itemService.getStockHistory(id, params);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock History fetched successfully",
      data: history.data,
      meta: history.meta,
    });
  });

  /**
   * PATCH /items/:id/inventory-type
   */
  setInventoryType = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: InventoryTypeInput = req.body;
    const item = await this.itemService.setInventoryType(id, data);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Inventory Type updated successfully",
      data: item,
    });
  });

  /**
   * PATCH /items/:id
   */
  patchItem = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: UpdateItemInput = req.body;
    if (req.file) {
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
    }
    const item = await this.itemService.updateItem(id, data);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Item updated successfully",
      data: item,
    });
  });

  /**
   * Bulk Stock Update
   */
  bulkStockUpdate = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as AuthenticatedUser;
    const data: BulkStockUpdateInput = req.body;
    await this.itemService.bulkStockUpdate(data, user.id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Bulk stock update completed successfully",
    });
  });

  /**
   * Bulk Inventory Type Update
   */
  bulkInventoryTypeUpdate = asyncHandler(
    async (req: Request, res: Response) => {
      const data: BulkInventoryTypeInput = req.body;
      await this.itemService.bulkInventoryTypeUpdate(data);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Bulk inventory type update completed successfully",
      });
    },
  );

  /**
   * Inventory Report
   */
  getInventoryReport = asyncHandler(async (req: Request, res: Response) => {
    const params: InventoryReportParams = {
      categoryId: req.query.categoryId
        ? Number(req.query.categoryId)
        : undefined,
      inventoryType: req.query.inventoryType as InventoryType | undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      includeOutOfStock:
        req.query.includeOutOfStock === "true" ||
        req.query.includeOutOfStock === undefined,
      includeLowStock:
        req.query.includeLowStock === "true" ||
        req.query.includeLowStock === undefined,
    };
    const report = await this.itemService.getInventoryReport(params);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Inventory report generated successfully",
      data: report,
    });
  });

  /**
   * Stock Summary
   */
  getStockSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await this.itemService.getStockSummary();
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock summary retrieved successfully",
      data: summary,
    });
  });

  deleteItem = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await this.itemService.deleteItem(id);
    res.status(HttpStatus.NO_CONTENT).send();
  });
}

export default new ItemController(itemService);
