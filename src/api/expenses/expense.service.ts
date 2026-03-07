import { ExpenseRepository } from "./expense.repository";
import { CreateExpenseDto, GetExpensesQueryDto } from "./expense.validator";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CashClosureRepository } from "../cash-closures/cash-closure.repository";

export class ExpenseService {
  private repository: ExpenseRepository;
  private cashClosureRepo: CashClosureRepository;

  constructor() {
    this.repository = new ExpenseRepository();
    this.cashClosureRepo = new CashClosureRepository();
  }

  async createExpense(data: CreateExpenseDto, registeredById: string) {
    const activeClosure = await this.cashClosureRepo.findCurrentOpen();
    if (!activeClosure) {
      throw new CustomError(
        "No hay un turno de caja abierto. Por favor abre caja antes de registrar gastos.",
        HttpStatus.BAD_REQUEST,
        "CASH_CLOSURE_REQUIRED",
      );
    }
    return this.repository.create({
      ...data,
      registeredById,
      cashClosureId: activeClosure.id,
    });
  }

  async listExpenses(query: GetExpensesQueryDto) {
    return this.repository.findAll(query);
  }

  async deleteExpense(id: string) {
    const expense = await this.repository.findById(id);

    if (!expense) {
      throw new CustomError("Expense not found", HttpStatus.NOT_FOUND);
    }

    return this.repository.softDelete(id);
  }
}
