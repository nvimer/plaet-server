import { Router } from "express";
import permissionsRouter from "./permissions/permission.routes";
import rolesRouter from "./roles/role.route";
import authRouter from "./auth/auth.route";
import usersRouter from "./users/user.route";
import tablesRouter from "./tables/table.route";
import menusRouter from "./menus/menus.route";
import profilesRouter from "./profiles/profile.route";
import ordersRouter from "./orders/order.route";
import { customerRoutes } from "./customers/customer.route";
import dailyMenuRouter from "./daily-menu/daily-menu.route";
import expensesRouter from "./expenses/expense.route";
import cashClosuresRouter from "./cash-closures/cash-closure.route";
import analyticsRouter from "./analytics/analytics.route";

/**
 * Main API Router for v1 endpoints.
 */
const router = Router();

/**
 * Permission Management Routes
 */
router.use("/permissions", permissionsRouter);

/**
 * Role Management Routes
 */
router.use("/roles", rolesRouter);

/**
 * Authentication Routes
 */
router.use("/auth", authRouter);

/**
 * User Management Routes
 */
router.use("/users", usersRouter);

/**
 * Table Management Routes
 */
router.use("/tables", tablesRouter);

/**
 * Menu Management Routes
 */
router.use("/menu", menusRouter);

/**
 * Profiles Management Routes
 */
router.use("/profile", profilesRouter);

/**
 * Orders Management Routes
 */
router.use("/orders", ordersRouter);
router.use("/customers", customerRoutes);

/**
 * Daily Menu Routes
 */
router.use("/daily-menu", dailyMenuRouter);

/**
 * Expenses Management Routes
 */
router.use("/expenses", expensesRouter);

/**
 * Cash Closures Management Routes
 */
router.use("/cash-closures", cashClosuresRouter);

/**
 * Analytics Routes
 */
router.use("/analytics", analyticsRouter);

export default router;
