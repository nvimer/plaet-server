import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { DailyMenuServiceInterface } from "./interfaces/daily-menu.service.interface";
import dailyMenuService from "./daily-menu.service";
import { UpdateDailyMenuBodyInput } from "./daily-menu.validator";

/**
 * DailyMenu Controller - Updated for Item-Based Daily Menu
 * Handles HTTP requests for daily menu management with MenuItem references
 */
class DailyMenuController {
  constructor(private service: DailyMenuServiceInterface = dailyMenuService) {}

  /**
   * GET /daily-menu/current
   * Get today's daily menu with full item details
   */
  getTodayMenu = asyncHandler(async (_req: Request, res: Response) => {
    const menu = await this.service.getTodayMenu();

    if (!menu) {
      res.status(HttpStatus.OK).json({
        success: true,
        message: "No daily menu configured for today",
        data: null,
      });
      return;
    }

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Daily menu retrieved successfully",
      data: menu,
    });
  });

  /**
   * GET /daily-menu/:date
   * Get daily menu for a specific date
   */
  getMenuByCreatedAt = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const createdAt = new Date(date + "T12:00:00.000Z");

    const menu = await this.service.getMenuByCreatedAt(createdAt);

    if (!menu) {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: `Daily menu not found for date: ${date}`,
        errorCode: "DAILY_MENU_NOT_FOUND",
      });
      return;
    }

    res.status(HttpStatus.OK).json({
      success: true,
      data: menu,
    });
  });

  /**
   * POST /daily-menu/today
   * Update or create today's daily menu
   */
  updateTodayMenu = asyncHandler(async (req: Request, res: Response) => {
    const data: UpdateDailyMenuBodyInput = req.body;
    const menu = await this.service.updateTodayMenu(data @typescript-eslint/no-explicit-any
    as any);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Today's daily menu updated successfully",
      data: menu,
    });
  });

  /**
   * POST /daily-menu/:date
   * Update daily menu for a specific date
   */
  updateMenuByCreatedAt = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const createdAt = new Date(date + "T12:00:00.000Z");
    const data: UpdateDailyMenuBodyInput = req.body;

    const menu = await this.service.updateMenuByCreatedAt(
      createdAt,
      data @typescript-eslint/no-explicit-any
    as any,
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message: `Daily menu for ${date} updated successfully`,
      data: menu,
    });
  });
}

// Export singleton instance
export default new DailyMenuController();
