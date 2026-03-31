import { CashClosureRepository } from "./cash-closure.repository";
import { OpenCashClosureDto } from "./cash-closure.validator";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CashClosureStatus, PaymentMethod } from "@prisma/client";

export type CashClosureSummary = {
  openingBalance: number;
  cashSales: number;
  nequiSales: number;
  totalVouchers?: number;
  vouchers?: number;
  totalDelivery?: number;
  deliveryCash?: number;
  deliveryNequi?: number;
  totalExpenses: number;
  expectedBalance: number;
  openingDate?: Date;
  closingDate?: Date;
};

export class CashClosureService {
  private repository: CashClosureRepository;

  constructor() {
    this.repository = new CashClosureRepository();
  }

  async getCurrentOpen() {
    return this.repository.findCurrentOpen();
  }

  async getSummary(id: string): Promise<CashClosureSummary> {
    const closure = await this.repository.findById(id);
    if (!closure) throw new CustomError("Not found", HttpStatus.NOT_FOUND);

    // If it's already closed, return the snapshot values
    if (closure.status === CashClosureStatus.CLOSED) {
      return {
        openingBalance: Number(closure.openingBalance),
        cashSales: Number(closure.totalCash || 0),
        nequiSales: Number(closure.totalNequi || 0),
        vouchers: Number(closure.totalVouchers || 0),
        totalDelivery: Number(closure.totalDelivery || 0),
        deliveryCash: Number(closure.deliveryCash || 0),
        deliveryNequi: Number(closure.deliveryNequi || 0),
        totalExpenses: Number(closure.totalExpenses || 0),
        expectedBalance: Number(closure.expectedBalance || 0),
        openingDate: closure.openingDate,
        closingDate: closure.closingDate || undefined,
      };
    }

    // If it's open, calculate current totals using explicit links
    const [cashSales, nequiSales, totalExpenses, totalVouchers, deliveryStats] =
      await Promise.all([
        this.repository.sumPaymentsByMethod(id, PaymentMethod.CASH),
        this.repository.sumPaymentsByMethod(id, PaymentMethod.NEQUI),
        this.repository.sumExpensesByClosure(id),
        this.repository.sumPaymentsByMethod(id, PaymentMethod.TICKET_BOOK),
        this.repository.sumDeliveryPaymentsByMethod(id),
      ]);

    const expectedBalance =
      Number(closure.openingBalance) + cashSales + deliveryStats.deliveryCash - totalExpenses;

    return {
      openingBalance: Number(closure.openingBalance),
      cashSales,
      nequiSales,
      totalExpenses,
      totalVouchers,
      totalDelivery: deliveryStats.totalDelivery,
      deliveryCash: deliveryStats.deliveryCash,
      deliveryNequi: deliveryStats.deliveryNequi,
      expectedBalance,
      openingDate: closure.openingDate,
    };
  }

  async openShift(
    data: OpenCashClosureDto,
    openedById: string,
    restaurantId: string,
  ) {
    const existingOpen =
      await this.repository.findCurrentOpenForTenant(restaurantId);
    if (existingOpen)
      throw new CustomError(
        "Ya existe un turno de caja abierto para este restaurante.",
        HttpStatus.BAD_REQUEST,
        "CASH_CLOSURE_ALREADY_OPEN",
      );
    return this.repository.create({ ...data, openedById, restaurantId });
  }

  async closeShift(
    id: string,
    data: {
      actualBalance: number;
      totalDelivery: number;
      deliveryCash?: number;
      deliveryNequi?: number;
    },
    closedById: string,
  ) {
    const summary = await this.getSummary(id);

    // Only Cash delivery affects the expected physical balance in drawer
    const deliveryCash = data.deliveryCash || 0;
    const finalExpectedBalance = summary.expectedBalance + deliveryCash;

    return this.repository.close(id, {
      actualBalance: data.actualBalance,
      expectedBalance: finalExpectedBalance,
      difference: data.actualBalance - finalExpectedBalance,
      totalCash: summary.cashSales,
      totalNequi: summary.nequiSales,
      totalExpenses: summary.totalExpenses,
      totalVouchers: summary.totalVouchers || summary.vouchers || 0,
      totalDelivery: data.totalDelivery,
      deliveryCash: data.deliveryCash || 0,
      deliveryNequi: data.deliveryNequi || 0,
      closedById,
      closingDate: new Date(),
    });
  }
}
