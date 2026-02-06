import { Router } from "express";
import dailyMenuController from "./daily-menu.controller";
import { validate } from "../../middlewares/validation.middleware";
import {
  updateDailyMenuBodySchema,
  dailyMenuDateParamSchema,
} from "./daily-menu.validator";
import { authJwt } from "../../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authJwt);

/**
 * GET /daily-menu/current
 * Get today's daily menu
 */
router.get("/current", dailyMenuController.getTodayMenu);

/**
 * GET /daily-menu/:date
 * Get daily menu for a specific date (YYYY-MM-DD)
 */
router.get(
  "/:date",
  validate(dailyMenuDateParamSchema),
  dailyMenuController.getMenuByDate,
);

/**
 * PUT /daily-menu
 * Update or create daily menu for today
 * Requires admin or manager role
 */
router.put(
  "/",
  validate(updateDailyMenuBodySchema),
  dailyMenuController.updateTodayMenu,
);

/**
 * PUT /daily-menu/:date
 * Update or create daily menu for a specific date
 * Requires admin or manager role
 */
router.put(
  "/:date",
  validate(dailyMenuDateParamSchema),
  validate(updateDailyMenuBodySchema),
  dailyMenuController.updateMenuByDate,
);

export default router;
