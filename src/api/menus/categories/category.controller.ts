import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CategoryServiceInterface } from "./interfaces/category.service.interface";
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CategorySearchParams,
  BulkCategoryInput,
} from "./category.validator";
import { HttpStatus } from "../../../utils/httpStatus.enum";
import categoryService from "./category.service";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  PaginationParams,
} from "../../../interfaces/pagination.interfaces";
class CategoryController {
  constructor(private categoryService: CategoryServiceInterface) {}

  /**
   * GET /categories
   *
   * Retrieves a paginated list of all menu categories in the system.
   * This endpoint supports pagination parameters for efficient
   * data retrieval and display.
   *
   * @param req - Express request object with pagination query parameters
   * @param res - Express response object
   *
   * Query Parameters:
   * - page: Page number (optional, defaults to 1)
   * - limit: Number of items per page (optional, defaults to 10)
   *
   * Response:
   * - 200: Categories retrieved successfully with pagination metadata
   * - 400: Invalid pagination parameters
   * - 500: Server error during retrieval
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    // Extract pagination parameters from query string with fallback to defaults
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_LIMIT;

    // Create pagination parameters object
    const params: PaginationParams = { page, limit };

    // Fetch categories from service layer with pagination
    const categories = await this.categoryService.findCategories(params);

    // Return successful response with categories data
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Categories fetched successfully",
      data: categories.data,
      meta: categories.meta,
    });
  });

  /**
   * GET /categories/search
   *
   * Searches menu categories with filtering and pagination capabilities.
   * This endpoint allows searching by name/description and filtering
   * by active status for efficient category management.
   *
   * @param req - Express request object with search and filter parameters
   * @param res - Express response object
   *
   * Query Parameters:
   * - page: Page number (optional, defaults to 1)
   * - limit: Number of items per page (optional, defaults to 10)
   * - search: Search term for name/description (optional)
   * - active: Filter by active status (true/false, optional)
   *
   * Response:
   * - 200: Filtered categories retrieved successfully
   * - 400: Invalid search parameters
   * - 500: Server error during search
   */
  searchCategories = asyncHandler(async (req: Request, res: Response) => {
    // Extract pagination and search parameters
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
    const params: PaginationParams & CategorySearchParams = {
      page,
      limit,
      search,
      active,
    };

    // Search categories from service layer
    const categories = await this.categoryService.searchCategories(params);

    // Return successful response with search results
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Categories search completed successfully",
      data: categories.data,
      meta: categories.meta,
    });
  });

  /**
   * GET /categories/:id
   *
   * Retrieves detailed information about a specific menu category by its ID.
   * This endpoint provides complete category information including
   * name, description, active status, and associated menu items.
   *
   * URL Parameters:
   * - id: Category ID (integer, required)
   *
   * Response:
   * - 200: Category details retrieved successfully
   * - 400: Invalid category ID format
   * - 404: Category not found
   * - 500: Server error during retrieval
   */
  getCategory = asyncHandler(async (req: Request, res: Response) => {
    // Extract and convert category ID from URL parameters
    const id = Number((req.params.id as string));

    // Fetch specific category from service layer
    const menuCategory = await this.categoryService.findCategoryById(id);

    // Return successful response with category data
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Menu Category fetched successfully",
      data: menuCategory,
    });
  });

  /**
   * POST /categories
   *
   * Creates a new menu category in the system with the provided information.
   * This endpoint handles category creation with validation and
   * ensures proper data structure and uniqueness.
   *
   * @param req - Express request object with category creation data
   * @param res - Express response object
   *
   * Request Body:
   * - name: Category name/identifier (string, required, unique)
   * - description: Category description (string, optional)
   * - active: Active status (boolean, optional, defaults to true)
   * - parentId: Parent category ID (number, optional, for hierarchy)
   * - sortOrder: Display order (number, optional)
   *
   * Response:
   * - 201: Category created successfully
   * - 400: Invalid request data or validation errors
   * - 409: Category with same name already exists
   * - 500: Server error during creation
   */
  postCategory = asyncHandler(async (req: Request, res: Response) => {
    // Extract validated category data from request body
    const data: CreateMenuCategoryInput = req.body;

    // Create new category through service layer
    const menuCategory = await this.categoryService.createCategory(data);

    // Return successful response with created category
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Menu Category created successfully",
      data: menuCategory,
    });
  });

  /**
   * PATCH /categories/:id
   *
   * Updates an existing menu category with new information.
   * This endpoint allows modification of category properties
   * while maintaining data integrity and validation.
   *
   * @param req - Express request object with category ID and update data
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Category ID to update (integer, required)
   *
   * Request Body:
   * - name: Updated category name (string, optional)
   * - description: Updated description (string, optional)
   * - active: Updated active status (boolean, optional)
   * - parentId: Updated parent category ID (number, optional)
   * - sortOrder: Updated display order (number, optional)
   *
   * Response:
   * - 202: Category updated successfully
   * - 400: Invalid request data or validation errors
   * - 404: Category not found
   * - 409: Name conflict with existing category
   * - 500: Server error during update
   */
  patchCategory = asyncHandler(async (req: Request, res: Response) => {
    // Extract validated update data from request body
    const data: UpdateMenuCategoryInput = req.body;

    // Extract and convert category ID from URL parameters
    const id = Number((req.params.id as string));

    // Update category through service layer
    const updatedCategory = await this.categoryService.updateCategory(id, data);

    // Return successful response with updated category
    res.status(HttpStatus.ACCEPTED).json({
      success: true,
      message: "Menu Category updated successfully",
      data: updatedCategory,
    });
  });

  /**
   * DELETE /categories/:id
   *
   * Performs a soft delete of a menu category from the system.
   * This endpoint marks the category as deleted without removing
   * the actual record from the database.
   *
   * @param req - Express request object with category ID parameter
   * @param res - Express response object
   *
   * URL Parameters:
   * - id: Category ID to delete (integer, required)
   *
   * Response:
   * - 200: Category deleted successfully
   * - 400: Invalid category ID format
   * - 404: Category not found
   * - 409: Category cannot be deleted (e.g., has active menu items)
   * - 500: Server error during deletion
   */
  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    // Extract and convert category ID from URL parameters
    const id = Number((req.params.id as string));

    // Delete category through service layer
    const deletedCategory = await this.categoryService.deleteCategory(id);

    // Return successful response with deletion confirmation
    res.status(HttpStatus.OK).json({
      success: true,
      message: `Menu Category with ID ${id} has been deleted successfully`,
      data: {
        id: deletedCategory.id,
        name: deletedCategory.name,
      },
    });
  });

  /**
   * DELETE /categories/bulk
   *
   * Performs bulk deletion of multiple menu categories.
   * This endpoint allows efficient removal of multiple categories
   * in a single operation with proper validation.
   *
   * @param req - Express request object with bulk deletion data
   * @param res - Express response object
   *
   * Request Body:
   * - ids: Array of category IDs to delete (number[], required)
   *
   * Response:
   * - 200: Bulk deletion completed successfully
   * - 400: Invalid request data or validation errors
   * - 404: One or more categories not found
   * - 409: Some categories cannot be deleted
   * - 500: Server error during bulk deletion

   */
  bulkDeleteCategories = asyncHandler(async (req: Request, res: Response) => {
    // Extract validated bulk deletion data from request body
    const data: BulkCategoryInput = req.body;
    // Perform bulk deletion through service layer
    const deletedCount = await this.categoryService.bulkDeleteCategories(data);
    // Return successful response with deletion count
    res.status(HttpStatus.OK).json({
      success: true,
      message: `${deletedCount} categories have been deleted successfully`,
      data: {
        deletedCount,
        ids: data.ids,
      },
    });
  });
}

export default new CategoryController(categoryService);
