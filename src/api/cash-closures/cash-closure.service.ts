import { CashClosureRepository } from "./cash-closure.repository";
import { OpenCashClosureDto } from "./cash-closure.validator";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CashClosureStatus } from "@prisma/client";

export class CashClosureService {
  private repository: CashClosureRepository;

  constructor() {
    this.repository = new CashClosureRepository();
  }

  async getCurrentOpen() {
    return this.repository.findCurrentOpen();
  }

  async openShift(data: OpenCashClosureDto, openedById: string) {
    const existingOpen = await this.repository.findCurrentOpen();

    if (existingOpen) {
      throw new CustomError(
        "There is already an open shift. Please close it before opening a new one.",
        HttpStatus.BAD_REQUEST
      );
    }

    return this.repository.create({ ...data, openedById });
  }

  async closeShift(id: string, actualBalance: number, closedById: string) {
    const closure = await this.repository.findById(id);

    if (!closure) {
      throw new CustomError("Cash closure shift not found.", HttpStatus.NOT_FOUND);
    }

    if (closure.status === CashClosureStatus.CLOSED) {
      throw new CustomError("This shift is already closed.", HttpStatus.BAD_REQUEST);
    }

    const closingDate = new Date();
    
    // Sum all orders PAID from openingDate to closingDate
    const totalSales = await this.repository.sumPaidOrdersTotalAmount(
      closure.openingDate,
      closingDate
    );

    const expectedBalance = Number(closure.openingBalance) + totalSales;
    const difference = actualBalance - expectedBalance;

    return this.repository.close(id, {
      actualBalance,
      expectedBalance,
      difference,
      closedById,
      closingDate,
    });
  }
}
