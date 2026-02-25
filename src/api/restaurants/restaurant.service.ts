import { Restaurant, RoleName } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { RestaurantServiceInterface } from "./interfaces/restaurant.service.interface";
import { RestaurantRepositoryInterface } from "./interfaces/restaurant.repository.interface";
import {
  CreateRestaurantInput,
  UpdateRestaurantInput,
  RestaurantSearchParams,
} from "./restaurant.validator";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../interfaces/pagination.interfaces";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import hasherUtils from "../../utils/hasher.utils";
import restaurantRepository from "./restaurant.repository";

/**
 * Restaurant Service
 */
export class RestaurantService implements RestaurantServiceInterface {
  constructor(private restaurantRepository: RestaurantRepositoryInterface) {}

  async getAllRestaurants(
    params: PaginationParams,
  ): Promise<PaginatedResponse<Restaurant>> {
    return this.restaurantRepository.findAll(params);
  }

  async searchRestaurants(
    params: PaginationParams & RestaurantSearchParams,
  ): Promise<PaginatedResponse<Restaurant>> {
    return this.restaurantRepository.search(params);
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw new CustomError(
        "Restaurant not found",
        HttpStatus.NOT_FOUND,
        "NOT_FOUND",
      );
    }
    return restaurant;
  }

  async createRestaurant(data: CreateRestaurantInput): Promise<Restaurant> {
    const prisma = getPrismaClient();
    const { adminUser, ...restaurantData } = data;

    // 1. Check if restaurant name already exists
    const existing = await prisma.restaurant.findUnique({
      where: { name: restaurantData.name },
    });
    if (existing) {
      throw new CustomError(
        "Restaurant name already exists",
        HttpStatus.CONFLICT,
        "NAME_CONFLICT",
      );
    }

    // 2. Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminUser.email },
    });
    if (existingUser) {
      throw new CustomError(
        "Admin email already exists",
        HttpStatus.CONFLICT,
        "EMAIL_CONFLICT",
      );
    }

    // 3. Create everything in a transaction
    return prisma.$transaction(async (tx: any) => {
      // a. Create Restaurant (using repository logic for slug)
      const restaurant = await this.restaurantRepository.create(restaurantData);

      // b. Find ADMIN role
      const adminRole = await tx.role.findUnique({
        where: { name: RoleName.ADMIN },
      });

      if (!adminRole) {
        throw new CustomError(
          "ADMIN role not found in system",
          HttpStatus.INTERNAL_SERVER_ERROR,
          "ROLE_NOT_FOUND",
        );
      }

      // c. Create Admin User
      const hashedPassword = hasherUtils.hash(adminUser.password);
      const user = await tx.user.create({
        data: {
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          phone: adminUser.phone,
          password: hashedPassword,
          restaurantId: restaurant.id, // Assign to new restaurant
        },
      });

      // d. Assign Role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      return restaurant;
    });
  }

  async updateRestaurant(
    id: string,
    data: UpdateRestaurantInput,
  ): Promise<Restaurant> {
    await this.getRestaurantById(id);
    return this.restaurantRepository.update(id, data);
  }

  async deleteRestaurant(id: string): Promise<Restaurant> {
    await this.getRestaurantById(id);
    return this.restaurantRepository.delete(id);
  }
}

export default new RestaurantService(restaurantRepository);
