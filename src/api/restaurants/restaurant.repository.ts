import { Restaurant, Prisma, RestaurantStatus } from "@prisma/client";
import { getPrismaClient } from "../../database/prisma";
import { RestaurantRepositoryInterface } from "./interfaces/restaurant.repository.interface";
import { CreateRestaurantInput, UpdateRestaurantInput, RestaurantSearchParams } from "./restaurant.validator";
import {
  PaginationParams,
  PaginatedResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../../interfaces/pagination.interfaces";
import { createPaginatedResponse } from "../../utils/pagination.helper";

/**
 * Restaurant Repository
 */
export class BasicRestaurantRepository implements RestaurantRepositoryInterface {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\W\_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Restaurant>> {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = params;
    const skip = (page - 1) * limit;

    const client = getPrismaClient();
    const [restaurants, total] = await Promise.all([
      client.restaurant.findMany({
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      client.restaurant.count({
        where: { deleted: false },
      }),
    ]);

    return createPaginatedResponse(restaurants, total, params);
  }

  async search(params: PaginationParams & RestaurantSearchParams): Promise<PaginatedResponse<Restaurant>> {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, status } = params;
    const skip = (page - 1) * limit;

    const client = getPrismaClient();
    const where: Prisma.RestaurantWhereInput = { deleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nit: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status as RestaurantStatus;
    }

    const [restaurants, total] = await Promise.all([
      client.restaurant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      client.restaurant.count({ where }),
    ]);

    return createPaginatedResponse(restaurants, total, params);
  }

  async findById(id: string): Promise<Restaurant | null> {
    const client = getPrismaClient();
    return client.restaurant.findUnique({
      where: { id, deleted: false },
    });
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const client = getPrismaClient();
    return client.restaurant.findUnique({
      where: { slug, deleted: false },
    });
  }

  async create(data: Omit<CreateRestaurantInput, "adminUser">): Promise<Restaurant> {
    const client = getPrismaClient();
    const slug = this.generateSlug(data.name);

    let uniqueSlug = slug;
    const existing = await client.restaurant.findUnique({ where: { slug: uniqueSlug } });
    if (existing) {
      uniqueSlug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    return client.restaurant.create({
      data: {
        ...data,
        slug: uniqueSlug,
        currency: data.currency || "COP",
        timezone: data.timezone || "America/Bogota",
      },
    });
  }

  async update(id: string, data: UpdateRestaurantInput): Promise<Restaurant> {
    const client = getPrismaClient();
    return client.restaurant.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Restaurant> {
    const client = getPrismaClient();
    return client.restaurant.update({
      where: { id },
      data: { 
        deleted: true, 
        deletedAt: new Date() 
      },
    });
  }
}

export default new BasicRestaurantRepository();
