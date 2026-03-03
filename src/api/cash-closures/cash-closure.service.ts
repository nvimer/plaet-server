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

  async getSummary(id: string) {
    const closure = await this.repository.findById(id);
    if (!closure) throw new CustomError("Not found", HttpStatus.NOT_FOUND);
    const now = new Date();
    const cashSales = await this.repository.sumCashPayments(
      closure.openingDate,
      now,
    );
    const totalExpenses = await this.repository.sumExpenses(
      closure.openingDate,
      now,
    );
    const expectedBalance =
      Number(closure.openingBalance) + cashSales - totalExpenses;
    return {
      openingBalance: Number(closure.openingBalance),
      cashSales,
      totalExpenses,
      expectedBalance,
      openingDate: closure.openingDate,
    };
  }

  async openShift(data: OpenCashClosureDto, openedById: string) {
    const existingOpen = await this.repository.findCurrentOpen();
    if (existingOpen)
      throw new CustomError("Already open", HttpStatus.BAD_REQUEST);
    return this.repository.create({ ...data, openedById });
  }

  async closeShift(id: string, actualBalance: number, closedById: string) {
    const summary = await this.getSummary(id);
    return this.repository.close(id, {
      actualBalance,
      expectedBalance: summary.expectedBalance,
      difference: actualBalance - summary.expectedBalance,
      closedById,
      closingDate: new Date(),
    });
  }
}
