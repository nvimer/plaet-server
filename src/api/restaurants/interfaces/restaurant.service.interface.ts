import { Restaurant } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { CreateRestaurantInput, UpdateRestaurantInput, RestaurantSearchParams } from "../restaurant.validator";

export interface RestaurantServiceInterface {
  getAllRestaurants(params: PaginationParams): Promise<PaginatedResponse<Restaurant>>;
  searchRestaurants(
    params: PaginationParams & RestaurantSearchParams,
  ): Promise<PaginatedResponse<Restaurant>>;
  getRestaurantById(id: string): Promise<Restaurant | null>;
  createRestaurant(data: CreateRestaurantInput): Promise<Restaurant>;
  updateRestaurant(id: string, data: UpdateRestaurantInput): Promise<Restaurant>;
  deleteRestaurant(id: string): Promise<Restaurant>;
}
