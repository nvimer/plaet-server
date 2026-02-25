import { Router } from "express";
import categoryController from "./category.controller";
import { validate } from "../../../middlewares/validation.middleware";
import { categoryIdSchema, categorySearchSchema } from "./category.validator";
import { paginationQuerySchema } from "../../../utils/pagination.schema";
import { authJwt } from "../../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);

/**
 * GET /categories
 */
router.get(
  "/",
  permissionMiddleware("menu:read"),
  validate(paginationQuerySchema),
  categoryController.getCategories,
);

/**
 * GET /categories/search
 */
router.get(
  "/search",
  permissionMiddleware("menu:read"),
  validate(categorySearchSchema),
  validate(paginationQuerySchema),
  categoryController.searchCategories,
);

/**
 * GET /categories/:id
 */
router.get(
  "/:id", 
  permissionMiddleware("menu:read"),
  validate(categoryIdSchema), 
  categoryController.getCategory
);

// NOTE: POST, PATCH, DELETE are currently disabled in original file

export default router;
