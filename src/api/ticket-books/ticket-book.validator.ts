import { z } from "zod";

export const sellTicketBookSchema = z.object({
  body: z.object({
    customerId: z.string().uuid("Invalid customer ID"),
    totalPortions: z.number().int().positive("Total portions must be positive"),
    purchasePrice: z.number().nonnegative("Purchase price must be non-negative"),
    expiryDays: z.number().int().positive().default(45),
  }),
});

export type SellTicketBookDto = z.infer<typeof sellTicketBookSchema>["body"];
