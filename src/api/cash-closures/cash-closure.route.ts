import { Router } from "express";
import passport from "passport";
import { CashClosureController } from "./cash-closure.controller";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { RoleName } from "@prisma/client";
import { validate } from "../../middlewares/validation.middleware";
import {
  openCashClosureSchema,
  closeCashClosureSchema,
} from "./cash-closure.validator";

const router = Router();
const controller = new CashClosureController();

/**
 * Authentication and RBAC
 * Only ADMIN and CASHIER can manage cash closures
 */
router.use(passport.authenticate("jwt", { session: false }));
router.use(roleMiddleware([RoleName.ADMIN, RoleName.CASHIER]));

/**
 * @route GET /api/v1/cash-closures/current
 * @desc Get the current open cash closure shift
 */
router.get("/current", controller.getCurrent);

/**
 * @route POST /api/v1/cash-closures
 * @desc Open a new cash closure shift
 */
router.post("/", validate(openCashClosureSchema), controller.open);

/**
 * @route PATCH /api/v1/cash-closures/:id/close
 * @desc Close a cash closure shift
 */
router.patch("/:id/close", validate(closeCashClosureSchema), controller.close);

export default router;
