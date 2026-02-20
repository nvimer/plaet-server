import { Request, Response } from "express";
import { ExpenseService } from "./expense.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { CreateExpenseDto, GetExpensesQueryDto } from "./expense.validator";

export class ExpenseController {
  private service: ExpenseService;

  constructor() {
    this.service = new ExpenseService();
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const data: CreateExpenseDto = req.body;
    const userId = req.user.id;

    const expense = await this.service.createExpense(data, userId);

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: expense,
    });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as GetExpensesQueryDto;
    const expenses = await this.service.listExpenses(query);

    res.status(HttpStatus.OK).json({
      success: true,
      data: expenses,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.deleteExpense(id);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Expense deleted successfully",
    });
  });
}
