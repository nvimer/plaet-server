import { Request, Response } from "express";
import { RestaurantServiceInterface } from "./interfaces/restaurant.service.interface";
import restaurantService from "./restaurant.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  PaginationParams,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../../interfaces/pagination.interfaces";

/**
 * Restaurant Controller
 */
export class RestaurantController {
  constructor(private restaurantService: RestaurantServiceInterface) {}

  /**
   * Get all restaurants with pagination
   */
  getAllRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const pagination: PaginationParams = { page, limit };

    const result = await this.restaurantService.getAllRestaurants(pagination);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Restaurants retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  });

  /**
   * Search restaurants with filters and pagination
   */
  searchRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const search = req.query.search as string;
    const status = req.query.status as any;

    const result = await this.restaurantService.searchRestaurants({
      page,
      limit,
      search,
      status,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Restaurants found successfully",
      data: result.data,
      meta: result.meta,
    });
  });

  /**
   * Get a restaurant by ID
   */
  getRestaurantById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const restaurant = await this.restaurantService.getRestaurantById(id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Restaurant retrieved successfully",
      data: restaurant,
    });
  });

  /**
   * Create a new restaurant and its admin user
   */
  createRestaurant = asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await this.restaurantService.createRestaurant(req.body);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Restaurant and admin user created successfully",
      data: restaurant,
    });
  });

  /**
   * Update a restaurant
   */
  updateRestaurant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const restaurant = await this.restaurantService.updateRestaurant(
      id,
      req.body,
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Restaurant updated successfully",
      data: restaurant,
    });
  });

  /**
   * Soft delete a restaurant
   */
  deleteRestaurant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.restaurantService.deleteRestaurant(id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  });
}

export default new RestaurantController(restaurantService);
