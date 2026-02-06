import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { DailyMenuServiceInterface } from "./interfaces/daily-menu.service.interface";
import dailyMenuService from "./daily-menu.service";
import {
  UpdateDailyMenuBodyInput,
} from "./daily-menu.validator";

/**
 * DailyMenu Controller
 * Handles HTTP requests for daily menu management
 */
export class DailyMenuController {
  constructor(
    private service: DailyMenuServiceInterface = dailyMenuService,
  ) {}

  /**
   * GET /daily-menu/current
   * Get today's daily menu
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
  getMenuByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid date format",
      });
      return;
    }

    const menu = await this.service.getMenuByDate(targetDate);

    if (!menu) {
      res.status(HttpStatus.OK).json({
        success: true,
        message: `No daily menu configured for ${date}`,
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
   * PUT /daily-menu
   * Update or create daily menu for today
   */
  updateTodayMenu = asyncHandler(async (req: Request, res: Response) => {
    const data: UpdateDailyMenuBodyInput = req.body;

    const updatedMenu = await this.service.updateTodayMenu(data);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Daily menu updated successfully",
      data: updatedMenu,
    });
  });

  /**
   * PUT /daily-menu/:date
   * Update or create daily menu for a specific date
   */
  updateMenuByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const data: UpdateDailyMenuBodyInput = req.body;

    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid date format",
      });
      return;
    }

    const updatedMenu = await this.service.updateMenuByDate(targetDate, data);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Daily menu updated successfully",
      data: updatedMenu,
    });
  });
}

// Export singleton instance
export default new DailyMenuController();
