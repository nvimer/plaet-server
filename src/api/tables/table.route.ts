import { Router } from "express";
import tableController from "./table.controller";
import { validate } from "../../middlewares/validation.middleware";
import {
  createTableSchema,
  updateTableSchema,
  tableIdSchema,
  updateTableStatusSchema,
} from "./table.validator";
import { paginationQuerySchema } from "../../utils/pagination.schema";
import { authJwt } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authJwt);
router.use(permissionMiddleware("tables:manage"));

/**
 * GET /tables
 */
router.get("/", validate(paginationQuerySchema), tableController.getTables);

/**
 * GET /tables/:id
 */
router.get("/:id", validate(tableIdSchema), tableController.getTableById);

/**
 * POST /tables
 */
router.post("/", validate(createTableSchema), tableController.postTable);

/**
 * PATCH /tables/:id
 */
router.patch("/:id", validate(updateTableSchema), tableController.updateTable);

/**
 * DELETE /tables/:id
 */
router.delete("/:id", validate(tableIdSchema), tableController.deleteTable);

/**
 * PATCH /tables/:id/status
 */
router.patch(
  "/:id/status",
  validate(updateTableStatusSchema),
  tableController.updateTableStatus,
);

export default router;
