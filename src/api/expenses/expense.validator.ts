import { z } from "zod";

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    date: z.string().datetime({ message: "Invalid date format (ISO 8601 required)" }).optional(),
  }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.string().optional(),
  }),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>["body"];
export type GetExpensesQueryDto = z.infer<typeof getExpensesQuerySchema>["query"];
