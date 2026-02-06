import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { ItemServiceInterface } from "./interfaces/item.service.interface";
import {
  AddStockBodyInput,
  CreateItemInput,
  DailyStockResetInput,
  InventoryTypeInput,
  MenuItemSearchParams,
} from "./item.validator";
import { HttpStatus } from "../../../utils/httpStatus.enum";
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
   *
   * Retrieves a paginated list of all menu-items in the system.
   * This endpoint supports pagination parameters for efficient
   * data retrieval and display.
   *
   * Response:
   * - 200: Menu Items retrieved successfully with pagination metadata
   * - 400: Invalid pagination parameters
   * - 500: Server error during retrieval
   */
  getMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;

    const params: PaginationParams = { page, limit };
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
   *
   * Searches menu items with filtering and pagination capabilities.
   * This endpoint allows searching by name/description and filtering
   * by active status for efficient menu item management.
   *
   * @param req - Express request object with search and filter Parameters
   * @param res - Express response object
   *
   * Query Paramenters:
   * - page: Page number (optional, defailts to 1)
   * - limit: Number of items per page (optional, defaults to 10)
   * - search: Search term for name/description (optional)
   * - active: Filter by active status (true/false, optional)
   *
   * Response:
   * - 200: Filtered menu items retrieved successfully
   * - 400: Invalid search parameters
   * - 500: Server error during search
   */
  searchMenuItems = asyncHandler(async (req: Request, res: Response) => {
    // Extract pagination and search Parameters
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_LIMIT;
    const search = req.query.search as string;
    const active =
      req.query.active === "true"
        ? true
        : req.query.active === "false"
          ? false
          : undefined;

    // Create combined parameters object
    const params: PaginationParams & MenuItemSearchParams = {
      page,
      limit,
      search,
      active,
    };

    // Search menu items from service layer
    const menuItems = await this.itemService.searchMenuItems(params);

    // Return successful response with search results
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Items search completed successfully",
      data: menuItems.data,
      meta: menuItems.meta,
    });
  });

  /**
   * GET /items/setLunch
   *
   * Retrieves menu items filtered by setLunch-specific criteria.
   * This endpoint is used for setLunch (set lunch) order creation
   * to get proteins, plate components, and extras.
   *
   * Query Parameters:
   * - page: Page number (optional, defaults to 1)
   * - limit: Number of items per page (optional, defaults to 20)
   * - isProtein: Filter by protein status (true/false, optional)
   * - isPlateComponent: Filter by plate component status (true/false, optional)
   * - componentType: Filter by component type ("soup", "principle", "salad", "additional")
   * - category: Filter by category name (optional)
   * - minPrice: Minimum price filter (optional)
   * - maxPrice: Maximum price filter (optional)
   *
   * Response:
   * - 200: Filtered menu items retrieved successfully
   * - 400: Invalid filter parameters
   * - 500: Server error during retrieval
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
   *
   * Retrieves detailed information about a specific menu item by its ID.
   * This endpoint provides complete menu-item information including
   * name, description, price, imageUrl, isExtra and isAvailable booleans.
   *
   * URL Parameters:
   * - id: Category ID (integer, required)
   *
   * Response:
   * - 200: Menu item details retrieved successfully
   * - 400: Invalid menu item  ID format
   * - 404: Menu item not found
   * - 500: Server error during retrieval
   */
  getMenuItem = asyncHandler(async (req: Request, res: Response) => {
    // Extract and convert menu item ID from URL parameters
    const id = Number(req.params.id);

    // Fetch specific menu item from service layer
    const menuItem = await this.itemService.findMenuItemById(id);

    // Return successful response with item data
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Item fetched successfully",
      data: menuItem,
    });
  });

  /**
   * POST /items
   *
   * Creates a new menu item in the system with the provided information.
   * This endpoint handles item creation with validation and
   * ensures proper data structure and category association.
   *
   * Request Body:
   * - name: Item name/identifier (string, required)
   * - description: Item description (string, optional)
   * - price: Item price (number, required)
   * - categoryId: Associated category ID (number, required)
   * - active: Active status (boolean, optional, defaults to true)
   * - imageUrl: Item image URL (string, optional)
   * - allergens: Array of allergens (string[], optional)
   * - preparationTime: Preparation time in minutes (number, optional)
   *
   * Response:
   * - 201: Item created successfully
   * - 400: Invalid request data or validation errors
   * - 404: Category not found
   * - 409: Item with same name already exists in category
   * - 500: Server error during creation
   */
  postItem = asyncHandler(async (req: Request, res: Response) => {
    // Extract validated item data from request body
    const data: CreateItemInput = req.body;

    // Create new item through service layer
    const item = await this.itemService.createItem(data);

    // Return successful response with created item
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Item created successfully",
      data: item,
    });
  });

  /**
   * POST /items/stock/daily-reset
   *
   * Registers the initial stock quantities for menu items at the start of the day.
   * This endpoint allows administrators to set stock levels for all pre-prepared
   * dishes in a single batch operation.
   *
   * @param req - Express request object with stock data in body
   * @param res - Express response object
   *
   * Request Body:
   * - items: Array of stock initialization objects
   *   - itemId: Menu item identifier (positive integer, required)
   *   - quantity: Initial stock quantity for the day (non-negative integer, required)
   *   - lowStockAlert: Alert threshold (non-negative integer, optional)
   *
   * Response:
   * - 200: Stock reset completed successfully
   * - 400: Invalid request data (validation errors, UNLIMITED items, etc.)
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 404: One or more items not found
   * - 500: Server error during operation
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
   *
   * Manually adds stock to a specific menu item. This endpoint is used
   * for mid-day stock additions, such as additional production runs or
   * inventory corrections.
   *
   * @param req - Express request object with item ID in params and stock data in body
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Menu item identifier (positive integer, required)
   *
   * Request Body:
   * - quantity: Number of units to add (positive integer, required)
   * - reason: Explanation for the addition (string, min 3 chars, required)
   *
   * Response:
   * - 200: Stock added successfully, returns updated item
   * - 400: Invalid data or UNLIMITED inventory type
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 404: Menu item not found
   * - 500: Server error during operation
   */
  addStock = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: AddStockBodyInput = req.body;
    const userId = req.user?.id;

    const item = await this.itemService.addStock(id, data, userId);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock added successfully",
      data: item,
    });
  });

  /**
   * POST /items/:id/stock/remove
   *
   * Manually removes stock from a specific menu item. This endpoint is used
   * for tracking waste, spoilage, damage, or other stock reductions that
   * occur outside of normal order fulfillment.
   *
   * @param req - Express request object with item ID in params and removal data in body
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Menu item identifier (positive integer, required)
   *
   * Request Body:
   * - quantity: Number of units to remove (positive integer, required)
   * - reason: Explanation for the removal (string, min 3 chars, optional but recommended)
   *
   * Response:
   * - 200: Stock removed successfully, returns updated item
   * - 400: Invalid data, UNLIMITED type, or insufficient stock
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 404: Menu item not found
   * - 500: Server error during operation
   */
  removeStock = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const data: AddStockBodyInput = req.body;
    const userId = req.user?.id;

    const item = await this.itemService.removeStock(id, data, userId);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Stock removed successfully",
      data: item,
    });
  });

  /**
   * GET /items/low-stock
   *
   * Retrieves a list of menu items that have reached or fallen below
   * their low stock alert threshold. This endpoint helps managers and
   * kitchen staff proactively manage inventory and prevent stockouts.
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query Parameters:
   * - None required
   *
   * Response:
   * - 200: Low stock items retrieved successfully
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 500: Server error during retrieval
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
   *
   * Retrieves a list of menu items that are completely out of stock.
   * This endpoint is critical for service staff to know what cannot be
   * ordered and for managers to prioritize production needs.
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query Parameters:
   * - None required
   *
   * Response:
   * - 200: Out of stock items retrieved successfully
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 500: Server error during retrieval
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
   *
   * Retrieves the complete stock adjustment history for a specific menu item.
   * This endpoint provides a detailed audit trail of all stock changes with
   * pagination support for efficient data retrieval.
   *
   * @param req - Express request object with item ID in params and pagination in query
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Menu item identifier (positive integer, required)
   *
   * Query Parameters:
   * - page: Current page number (positive integer, optional, default: 1)
   * - limit: Records per page (positive integer, optional, default: 20, max: 100)
   *
   * Response:
   * - 200: Stock history retrieved successfully
   * - 400: Invalid parameters (negative page, invalid limit, etc.)
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 404: Menu item not found
   * - 500: Server error during retrieval
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
   *
   * Configures the inventory tracking type for a specific menu item.
   * This endpoint determines whether an item requires stock tracking
   * (TRACKED) or has unlimited availability (UNLIMITED).
   *
   * @param req - Express request object with item ID in params and config in body
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Menu item identifier (positive integer, required)
   *
   * Request Body:
   * - inventoryType: Tracking mode ("TRACKED" | "UNLIMITED", required)
   * - lowStockAlert: Alert threshold (non-negative integer, optional)
   *
   * Response:
   * - 200: Inventory type updated successfully
   * - 400: Invalid inventory type or parameters
   * - 401: User not authenticated
   * - 403: User lacks required permissions
   * - 404: Menu item not found
   * - 500: Server error during update
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
}

export default new ItemController(itemService);
