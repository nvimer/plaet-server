import { Router } from "express";
import categoryController from "./category.controller";
import { validate } from "../../../middlewares/validation.middleware";
import { authJwt } from "../../../middlewares/auth.middleware";
import {
  categoryIdSchema,
  createMenuCategorySchema,
  updateMenuCategorySchema,
  categorySearchSchema,
  bulkCategorySchema,
} from "./category.validator";
import { paginationQuerySchema } from "../../../utils/pagination.schema";

const router = Router();

/**
 * GET /categories
 * Retrieves a paginated list of all menu categories.
 */
router.get(
  "/",
  validate(paginationQuerySchema),
  categoryController.getCategories,
);

/**
 * GET /categories/search
 * Searches for menu categories with optional filtering and pagination.
 */
router.get(
  "/search",
  validate(categorySearchSchema),
  validate(paginationQuerySchema),
  categoryController.searchCategories,
);

/**
 * POST /categories
 * Creates a new menu category.
 * (DISABLED: Categories are managed via seeds for now)
 */
/*
router.post(
  "/",
  validate(createMenuCategorySchema),
  categoryController.postCategory,
);
*/

/**
 * GET /categories/:id
 * Retrieves a specific menu category by its ID.
 */
router.get("/:id", validate(categoryIdSchema), categoryController.getCategory);

/**
 * PATCH /categories/:id
 * Updates an existing menu category.
 * (DISABLED: Categories are managed via seeds for now)
 */
/*
router.patch(
  "/:id",
  validate(categoryIdSchema),
  validate(updateMenuCategorySchema),
  categoryController.patchCategory,
);
*/

/**
 * DELETE /categories/:id
 * (DISABLED)
 */
/*
router.delete(
  "/:id",
  validate(categoryIdSchema),
  categoryController.deleteCategory,
);
*/

/**
 * DELETE /categories/bulk
 * (DISABLED)
 */
/*
router.delete(
  "/bulk",
  authJwt,
  validate(bulkCategorySchema),
  categoryController.bulkDeleteCategories,
);
*/

export default router;
