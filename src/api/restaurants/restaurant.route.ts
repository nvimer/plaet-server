import { Router } from "express";
import restaurantController from "./restaurant.controller";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantIdSchema,
  restaurantSearchSchema,
} from "./restaurant.validator";
import { validate } from "../../middlewares/validation.middleware";
import { authJwt } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { RoleName } from "@prisma/client";

const router = Router();

/**
 * All routes in this module are protected and require SUPERADMIN role
 */
router.use(authJwt, roleMiddleware([RoleName.SUPERADMIN]));

/**
 * GET /api/v1/restaurants
 * Get all restaurants with pagination
 */
router.get("/", restaurantController.getAllRestaurants);

/**
 * GET /api/v1/restaurants/search
 * Search restaurants with filters
 */
router.get(
  "/search",
  validate(restaurantSearchSchema),
  restaurantController.searchRestaurants,
);

/**
 * GET /api/v1/restaurants/:id
 * Get a restaurant by ID
 */
router.get(
  "/:id",
  validate(restaurantIdSchema),
  restaurantController.getRestaurantById,
);

/**
 * POST /api/v1/restaurants
 * Create a new restaurant and its admin user
 */
router.post(
  "/",
  validate(createRestaurantSchema),
  restaurantController.createRestaurant,
);

/**
 * PATCH /api/v1/restaurants/:id
 * Update a restaurant
 */
router.patch(
  "/:id",
  validate(restaurantIdSchema),
  validate(updateRestaurantSchema),
  restaurantController.updateRestaurant,
);

/**
 * DELETE /api/v1/restaurants/:id
 * Soft delete a restaurant
 */
router.delete(
  "/:id",
  validate(restaurantIdSchema),
  restaurantController.deleteRestaurant,
);

export default router;
