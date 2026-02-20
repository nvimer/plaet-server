import prisma from "../../database/prisma";
import { CreateExpenseDto, GetExpensesQueryDto } from "./expense.validator";

export class ExpenseRepository {
  async create(data: CreateExpenseDto & { registeredById: string }) {
    return prisma.expense.create({
      data: {
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date ? new Date(data.date) : new Date(),
        registeredBy: {
          connect: { id: data.registeredById },
        },
      },
    });
  }

  async findAll(query: GetExpensesQueryDto) {
    const { startDate, endDate, category } = query;

    return prisma.expense.findMany({
      where: {
        deleted: false,
        category,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: {
        date: "desc",
      },
      include: {
        registeredBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.expense.findUnique({
      where: { id, deleted: false },
    });
  }

  async softDelete(id: string) {
    return prisma.expense.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
