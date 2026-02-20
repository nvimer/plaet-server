import { Request, Response } from "express";
import { CashClosureService } from "./cash-closure.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import {
  OpenCashClosureDto,
  CloseCashClosureDto,
} from "./cash-closure.validator";

export class CashClosureController {
  private service: CashClosureService;

  constructor() {
    this.service = new CashClosureService();
  }

  getCurrent = asyncHandler(async (req: Request, res: Response) => {
    const current = await this.service.getCurrentOpen();

    res.status(HttpStatus.OK).json({
      success: true,
      data: current,
    });
  });

  open = asyncHandler(async (req: Request, res: Response) => {
    const data: OpenCashClosureDto = req.body;
    const userId = req.user.id;

    const closure = await this.service.openShift(data, userId);

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: closure,
    });
  });

  close = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { actualBalance }: CloseCashClosureDto = req.body;
    const userId = req.user.id;

    const closure = await this.service.closeShift(id, actualBalance, userId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: closure,
    });
  });
}
