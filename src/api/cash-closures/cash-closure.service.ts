import { CashClosureRepository } from "./cash-closure.repository";
import { OpenCashClosureDto } from "./cash-closure.validator";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CashClosureStatus, PaymentMethod } from "@prisma/client";

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

    // If it's already closed, return the snapshot values
    if (closure.status === CashClosureStatus.CLOSED) {
      return {
        openingBalance: Number(closure.openingBalance),
        cashSales: Number(closure.totalCash || 0),
        nequiSales: Number(closure.totalNequi || 0),
        vouchers: Number(closure.totalVouchers || 0),
        totalExpenses: Number(closure.totalExpenses || 0),
        expectedBalance: Number(closure.expectedBalance || 0),
        openingDate: closure.openingDate,
        closingDate: closure.closingDate,
      };
    }

    // If it's open, calculate current totals using explicit links
    const [cashSales, nequiSales, totalExpenses, totalVouchers] =
      await Promise.all([
        this.repository.sumPaymentsByMethod(id, PaymentMethod.CASH),
        this.repository.sumPaymentsByMethod(id, PaymentMethod.NEQUI),
        this.repository.sumExpensesByClosure(id),
        this.repository.sumPaymentsByMethod(id, PaymentMethod.TICKET_BOOK),
      ]);

    const expectedBalance =
      Number(closure.openingBalance) + cashSales - totalExpenses;

    return {
      openingBalance: Number(closure.openingBalance),
      cashSales,
      nequiSales,
      totalExpenses,
      totalVouchers,
      expectedBalance,
      openingDate: closure.openingDate,
    };
  }

  async openShift(data: OpenCashClosureDto, openedById: string, restaurantId: string) {
    const existingOpen = await this.repository.findCurrentOpenForTenant(restaurantId);
    if (existingOpen)
      throw new CustomError(
        "Ya existe un turno de caja abierto para este restaurante.", 
        HttpStatus.BAD_REQUEST,
        "CASH_CLOSURE_ALREADY_OPEN"
      );
    return this.repository.create({ ...data, openedById, restaurantId });
  }

  async closeShift(id: string, actualBalance: number, closedById: string) {
    const summary = await this.getSummary(id);
    return this.repository.close(id, {
      actualBalance,
      expectedBalance: summary.expectedBalance,
      difference: actualBalance - summary.expectedBalance,
      totalCash: summary.cashSales,
      totalNequi: (summary as any).nequiSales,
      totalExpenses: summary.totalExpenses,
      totalVouchers: (summary as any).totalVouchers,
      closedById,
      closingDate: new Date(),
    });
  }
}
