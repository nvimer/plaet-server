import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware";
import { userIdSchema, userSearchSchema } from "./user.validator";
import { paginationQuerySchema } from "../../utils/pagination.schema";
import userController from "./user.controller";
import { authJwt } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);

/**
 * GET /users
 */
router.get(
  "/",
  permissionMiddleware("users:read"),
  validate(paginationQuerySchema),
  userController.getUsers,
);

/**
 * GET /users/search
 */
router.get(
  "/search",
  permissionMiddleware("users:read"),
  validate(userSearchSchema),
  validate(paginationQuerySchema),
  userController.searchUsers,
);

/**
 * GET /users/:id
 */
router.get(
  "/:id",
  permissionMiddleware("users:read"),
  validate(userIdSchema),
  userController.getUserById,
);

/**
 * GET /users/email/:email
 */
router.get(
  "/email/:email",
  permissionMiddleware("users:read"),
  userController.getUserByEmail,
);

/**
 * POST /users/register
 */
router.post(
  "/register",
  permissionMiddleware("users:create"),
  userController.registerUser,
);

/**
 * PATCH /users/:id
 */
router.patch(
  "/:id",
  permissionMiddleware("users:update"),
  validate(userIdSchema),
  userController.updateUser,
);

/**
 * GET /users/:id/roles-permissions
 */
router.get(
  "/:id/roles-permissions",
  permissionMiddleware("users:read"),
  validate(userIdSchema),
  userController.getUserWithRolesAndPermissions,
);

export default router;
