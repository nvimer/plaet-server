import { ExpenseRepository } from "./expense.repository";
import { CreateExpenseDto, GetExpensesQueryDto } from "./expense.validator";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";

export class ExpenseService {
  private repository: ExpenseRepository;

  constructor() {
    this.repository = new ExpenseRepository();
  }

  async createExpense(data: CreateExpenseDto, registeredById: string) {
    return this.repository.create({ ...data, registeredById });
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
