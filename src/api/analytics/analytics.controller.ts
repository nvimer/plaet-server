import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { GetDailySummaryDto } from "./analytics.validator";

export class AnalyticsController {
  private service: AnalyticsService;

  constructor() {
    this.service = new AnalyticsService();
  }

  getDailySummary = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query as unknown as GetDailySummaryDto;
    const summary = await this.service.getDailySummary(date);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary,
    });
  });

  getMenuEngineering = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as {
      startDate: string;
      endDate: string;
    };
    const data = await this.service.getMenuEngineering(startDate, endDate);

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  getSalesPrediction = asyncHandler(async (req: Request, res: Response) => {
    const { targetDate } = req.query as { targetDate: string };
    const data = await this.service.getSalesPrediction(targetDate);

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });

  getHeatmap = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as {
      startDate: string;
      endDate: string;
    };
    const data = await this.service.getHeatmap(startDate, endDate);

    res.status(HttpStatus.OK).json({
      success: true,
      data,
    });
  });
}
