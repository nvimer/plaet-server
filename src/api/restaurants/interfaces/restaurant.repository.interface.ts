import { Restaurant } from "@prisma/client";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../interfaces/pagination.interfaces";
import { CreateRestaurantInput, UpdateRestaurantInput, RestaurantSearchParams } from "../restaurant.validator";

export interface RestaurantRepositoryInterface {
  findAll(params: PaginationParams): Promise<PaginatedResponse<Restaurant>>;
  search(
    params: PaginationParams & RestaurantSearchParams,
  ): Promise<PaginatedResponse<Restaurant>>;
  findById(id: string): Promise<Restaurant | null>;
  findBySlug(slug: string): Promise<Restaurant | null>;
  create(data: Omit<CreateRestaurantInput, "adminUser">): Promise<Restaurant>;
  update(id: string, data: UpdateRestaurantInput): Promise<Restaurant>;
  delete(id: string): Promise<Restaurant>;
}
