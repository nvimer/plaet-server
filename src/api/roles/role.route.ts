import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware";
import {
  createRoleSchema,
  roleIdSchema,
  updateRoleSchema,
  roleSearchSchema,
  bulkRoleSchema,
} from "./role.validator";
import { paginationQuerySchema } from "../../utils/pagination.schema";
import roleController from "./role.controller";
import rolePermissionsRouter from "./role-permissions.route";
import { authJwt } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);
router.use(permissionMiddleware("roles:manage"));

/**
 * Role permissions management sub-router
 */
router.use("/permissions", rolePermissionsRouter);

/**
 * GET /roles
 */
router.get("/", validate(paginationQuerySchema), roleController.getRoles);

/**
 * GET /roles/search
 */
router.get(
  "/search",
  validate(roleSearchSchema),
  validate(paginationQuerySchema),
  roleController.searchRoles,
);

/**
 * POST /roles
 */
router.post("/", validate(createRoleSchema), roleController.postRole);

/**
 * GET /roles/:id
 */
router.get("/:id", validate(roleIdSchema), roleController.getRoleById);

/**
 * PATCH /roles/:id
 */
router.patch(
  "/:id",
  validate(roleIdSchema),
  validate(updateRoleSchema),
  roleController.patchRole,
);

/**
 * DELETE /roles/:id
 */
router.delete("/:id", validate(roleIdSchema), roleController.deleteRole);

/**
 * DELETE /roles/bulk
 */
router.delete(
  "/bulk",
  validate(bulkRoleSchema),
  roleController.bulkDeleteRoles,
);

export default router;
