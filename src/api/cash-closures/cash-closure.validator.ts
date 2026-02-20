import { z } from "zod";

export const openCashClosureSchema = z.object({
  body: z.object({
    openingBalance: z
      .number()
      .nonnegative("Opening balance must be non-negative"),
  }),
});

export const closeCashClosureSchema = z.object({
  body: z.object({
    actualBalance: z
      .number()
      .nonnegative("Actual balance must be non-negative"),
  }),
  params: z.object({
    id: z.string().uuid("Invalid closure ID"),
  }),
});

export type OpenCashClosureDto = z.infer<typeof openCashClosureSchema>["body"];
export type CloseCashClosureDto = z.infer<
  typeof closeCashClosureSchema
>["body"];
