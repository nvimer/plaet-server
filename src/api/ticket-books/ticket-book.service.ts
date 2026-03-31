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

      // 2. Check daily limit: max 3 ticket books per customer per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyBooks = await tx.ticketBook.count({
        where: {
          customerId: data.customerId,
          purchaseDate: {
            gte: today,
            lt: tomorrow,
          },
          status: "active",
        },
      });

      if (dailyBooks >= 3) {
        throw new CustomError(
          "El cliente ya ha adquirido el límite máximo de 3 tiqueteras hoy. Intenta mañana.",
          HttpStatus.BAD_REQUEST,
          "DAILY_TICKET_LIMIT_EXCEEDED"
        );
      }

      // 3. Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + data.expiryDays);

      // 4. Create TicketBook
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

      // 5. Register the Payment in the Cash Closure
      // Since it's a Tiquetera SALE, it's CASH income today
      await tx.payment.create({
        data: {
          method: PaymentMethod.CASH, // Customer paid in cash/nequi for the book
          amount: data.purchasePrice,
          cashClosureId: activeClosure.id,
          transactionRef: `Venta Tiquetera: ${data.totalPortions} porciones`,
        },
      });

      return ticketBook;
    });
  }

  async getCustomerTickets(customerId: string): Promise<TicketBook[]> {
    return await this.repository.findByCustomerId(customerId);
  }
}
