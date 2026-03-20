import { TicketBook, PaymentMethod } from "@prisma/client";
import { TicketBookRepository } from "./ticket-book.repository";
import { SellTicketBookDto } from "./ticket-book.validator";
import { getPrismaClient } from "../../database/prisma";
import { PrismaTransaction } from "../../types/prisma-transaction.types";
import { CashClosureRepository } from "../cash-closures/cash-closure.repository";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";

export class TicketBookService {
  private repository: TicketBookRepository;
  private cashClosureRepo = new CashClosureRepository();
  private prisma = getPrismaClient();

  constructor() {
    this.repository = new TicketBookRepository();
  }

  async sellTicketBook(
    data: SellTicketBookDto,
    restaurantId: string,
  ): Promise<TicketBook> {
    return await this.prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Ensure there is an open cash closure
      const activeClosure = await this.cashClosureRepo.findCurrentOpen(restaurantId);
      if (!activeClosure) {
        throw new CustomError(
          "No hay un turno de caja abierto. Por favor abre caja antes de vender tiqueteras.",
          HttpStatus.BAD_REQUEST,
          "CASH_CLOSURE_REQUIRED"
        );
      }

      // 2. Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + data.expiryDays);

      // 3. Create TicketBook
      const ticketBook = await tx.ticketBook.create({
        data: {
          customerId: data.customerId,
          totalPortions: data.totalPortions,
          consumedPortions: 0,
          purchasePrice: data.purchasePrice,
          purchaseDate: new Date(),
          expiryDate,
          status: "active",
          restaurantId,
        },
      });

      // 4. Register the Payment in the Cash Closure
      // Since it's a Tiquetera SALE, it's CASH income today
      await tx.payment.create({
        data: {
          method: PaymentMethod.CASH, // Customer paid in cash/nequi for the book
          amount: data.purchasePrice,
          cashClosureId: activeClosure.id,
          notes: `Venta Tiquetera: ${data.totalPortions} porciones`,
        } as any, // type cast for notes if not in schema yet or using manual item notes
      });

      return ticketBook;
    });
  }

  async getCustomerTickets(customerId: string): Promise<TicketBook[]> {
    return await this.repository.findByCustomerId(customerId);
  }
}
