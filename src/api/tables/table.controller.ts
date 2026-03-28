import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { TableServiceInterface } from "./interfaces/table.service.interface";
import { HttpStatus } from "../../utils/httpStatus.enum";
import tableService from "./table.service";
import { PaginationParams } from "../../interfaces/pagination.interfaces";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from "../../interfaces/pagination.interfaces";

/**
 * Table Controller
 */
class TableController {
  constructor(private tableService: TableServiceInterface) {}

  /**
   * GET /tables
   *
   * Retrieves a paginated list of all tables in the system.
   * This endpoint supports pagination parameters for efficient
   * data retrieval and display.
   *
   * Response:
   * - 200: Tables retrieved successfully with pagination metadata
   * - 400: Invalid pagination parameters
   * - 500: Server error during retrieval
   */
  getTables = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;

    const params: PaginationParams = { page, limit };
    const tables = await this.tableService.findAllTables(params);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Tables fetched successfully",
      data: tables.data,
      meta: tables.meta,
    });
  });

  /**
   * GET /tables/:id
   *
   * Retrieves detailed information about a specific table by its ID.
   * This endpoint provides complete table information including
   * status, capacity, and other relevant details.
   *
   * Response:
   * - 200: Table details retrieved successfully
   * - 400: Invalid table ID format
   * - 404: Table not found
   * - 500: Server error during retrieval
   *
   */
  getTableById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt((req.params.id as string), 10);
    const table = await this.tableService.findTableById(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Table fetched successfully",
      data: table,
    });
  });

  /**
   * POST /tables
   *
   * Creates a new table in the system with the provided information.
   * This endpoint handles table creation with validation and
   * ensures proper data structure.
   *
   * Response:
   * - 201: Table created successfully
   * - 400: Invalid request data or validation errors
   * - 409: Table with same name already exists
   * - 500: Server error during creation
   */
  postTable = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const table = await this.tableService.createTable(data);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Table created successfully",
      data: table,
    });
  });

  /**
   * PUT /tables/:id
   *
   * Updates an existing table with new information.
   * This endpoint allows modification of table properties
   * while maintaining data integrity and validation.
   *
   * Response:
   * - 200: Table updated successfully
   * - 400: Invalid request data or validation errors
   * - 404: Table not found
   * - 409: Name conflict with existing table
   * - 500: Server error during update
   */
  updateTable = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt((req.params.id as string), 10);
    const data = req.body;
    const table = await this.tableService.updateTable(id, data);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Table updated successfully",
      data: table,
    });
  });

  /**
   * DELETE /tables/:id
   *
   * Removes a table from the system permanently.
   * This endpoint handles table deletion with proper
   * cleanup and validation.
   *
   * Response:
   * - 200: Table deleted successfully
   * - 400: Invalid table ID format
   * - 404: Table not found
   * - 409: Table cannot be deleted (e.g., has active reservations)
   * - 500: Server error during deletion
   *
   */
  deleteTable = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt((req.params.id as string), 10);
    await this.tableService.deleteTable(id);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Table deleted successfully",
    });
  });

  /**
   * PATCH /tables/:id/status
   *
   * Updates the status of a specific table (available/occupied).
   * This endpoint is commonly used for real-time table status
   * management in restaurant operations.
   *
   * Response:
   * - 200: Table status updated successfully
   * - 400: Invalid status value or table ID
   * - 404: Table not found
   * - 500: Server error during status update
   */
  updateTableStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt((req.params.id as string), 10);
    const { status } = req.body;
    const table = await this.tableService.updateTableStatus(id, status);
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Table status updated successfully",
      data: table,
    });
  });
}

export default new TableController(tableService);
