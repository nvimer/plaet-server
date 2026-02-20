import { Router } from "express";
import passport from "passport";
import { ExpenseController } from "./expense.controller";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { RoleName } from "@prisma/client";
import { validate } from "../../middlewares/validation.middleware";
import { createExpenseSchema, getExpensesQuerySchema } from "./expense.validator";

const router = Router();
const controller = new ExpenseController();

/**
 * Authentication and RBAC
 * Only ADMIN can manage expenses
 */
router.use(passport.authenticate("jwt", { session: false }));
router.use(roleMiddleware([RoleName.ADMIN]));

/**
 * @route POST /api/v1/expenses
 * @desc Create a new expense
 */
router.post(
  "/",
  validate(createExpenseSchema),
  controller.create
);

/**
 * @route GET /api/v1/expenses
 * @desc List expenses with optional filters
 */
router.get(
  "/",
  validate(getExpensesQuerySchema),
  controller.list
);

/**
 * @route DELETE /api/v1/expenses/:id
 * @desc Delete (soft) an expense
 */
router.delete("/:id", controller.delete);

export default router;
