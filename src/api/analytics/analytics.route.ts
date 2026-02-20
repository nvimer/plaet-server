import { Router } from "express";
import passport from "passport";
import { AnalyticsController } from "./analytics.controller";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { RoleName } from "@prisma/client";
import { validate } from "../../middlewares/validation.middleware";
import { getDailySummarySchema } from "./analytics.validator";

const router = Router();
const controller = new AnalyticsController();

/**
 * Authentication and RBAC
 * Only ADMIN can access analytics
 */
router.use(passport.authenticate("jwt", { session: false }));
router.use(roleMiddleware([RoleName.ADMIN]));

/**
 * @route GET /api/v1/analytics/daily-summary
 * @desc Get daily sales and financial summary
 */
router.get(
  "/daily-summary",
  validate(getDailySummarySchema),
  controller.getDailySummary
);

export default router;
