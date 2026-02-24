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
  authJwt,
  validate(dailyMenuDateParamSchema),
  dailyMenuController.getMenuByCreatedAt,
);

router.post(
  "/today",
  authJwt,
  validate(updateDailyMenuBodySchema),
  dailyMenuController.updateTodayMenu,
);

router.post(
  "/:date",
  authJwt,
  validate(dailyMenuDateParamSchema),
  validate(updateDailyMenuBodySchema),
  dailyMenuController.updateMenuByCreatedAt,
);

export default router;
