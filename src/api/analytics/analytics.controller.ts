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
}
