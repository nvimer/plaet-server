import {
  Payment,
  PaymentMethod,
  OrderStatus,
  TicketBook,
} from "@prisma/client";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { getPrismaClient } from "../../database/prisma";
import { PrismaTransaction } from "../../types/prisma-transaction.types";
import paymentRepository from "./payment.repository";
import { IPaymentRepository } from "./interfaces/payment.repository.interface";
import { CustomerRepository } from "../customers/customer.repository";
import { ICustomerRepository } from "../customers/interfaces/customer.repository.interface";
import { CashClosureRepository } from "../cash-closures/cash-closure.repository";

export class PaymentService {
  private prisma = getPrismaClient();
  private cashClosureRepo = new CashClosureRepository();

  constructor(
    private paymentRepo: IPaymentRepository,
    private customerRepo: ICustomerRepository,
  ) {}

  async createPayment(
    orderId: string,
    data: {
      method: PaymentMethod;
      amount: number;
      transactionRef?: string;
      phone?: string;
    },
  ): Promise<Payment> {
    return await this.prisma.$transaction(async (tx: PrismaTransaction) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order)
        throw new CustomError("Order not found", HttpStatus.NOT_FOUND);

      // 0. Ensure there is an open cash closure
      const activeClosure = await this.cashClosureRepo.findCurrentOpen();
      if (!activeClosure) {
        throw new CustomError(
          "No hay un turno de caja abierto. Por favor abre caja antes de registrar pagos.",
          HttpStatus.BAD_REQUEST,
          "CASH_CLOSURE_REQUIRED",
        );
      }

      // 1. Create the payment record first to get the ID
      const payment = await this.paymentRepo.create(
        {
          orderId,
          method: data.method,
          amount: data.amount,
          transactionRef: data.transactionRef,
          cashClosureId: activeClosure.id,
        },
        tx,
      );

      // 2. Specialized logic for TicketBook (Vouchers)
      if (data.method === PaymentMethod.TICKET_BOOK) {
        if (!data.phone)
          throw new CustomError(
            "Phone required for ticket book payment",
            HttpStatus.BAD_REQUEST,
          );

        const customer = await this.customerRepo.findByPhoneWithActiveTickets(
          data.phone,
        );
        if (!customer)
          throw new CustomError("Customer not found", HttpStatus.NOT_FOUND);

        const activeTicket = customer.ticketBooks.find(
          (tb: TicketBook) => tb.consumedPortions < tb.totalPortions,
        );
        if (!activeTicket)
          throw new CustomError(
            "No active ticket book with portions available",
            HttpStatus.BAD_REQUEST,
          );

        // Update TicketBook portions
        await tx.ticketBook.update({
          where: { id: activeTicket.id },
          data: { consumedPortions: { increment: 1 } },
        });

        // Register usage. Note: daily_code_id is mandatory in schema, so we look for or create a generic one for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let dailyCode = await tx.dailyTicketBookCode.findFirst({
          where: { customerId: customer.id, date: today },
        });

        if (!dailyCode) {
          dailyCode = await tx.dailyTicketBookCode.create({
            data: {
              customerId: customer.id,
              code: Math.random().toString(36).substring(2, 6).toUpperCase(),
              date: today,
              isUsed: true,
            },
          });
        }

        await tx.ticketBookUsage.create({
          data: {
            ticketBookId: activeTicket.id,
            paymentId: payment.id,
            dailyCodeId: dailyCode.id,
            portionCount: 1,
          },
        });
      }

      // 3. Update Order Status if fully paid
      const totalPaid =
        order.payments.reduce((sum, p) => sum + Number(p.amount), 0) +
        data.amount;
      if (totalPaid >= Number(order.totalAmount)) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });

        // If there is a table, mark it as occupied
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: "OCCUPIED" },
          });
        }
      }

      return payment;
    });
  }
}

const customerRepo = new CustomerRepository();
export default new PaymentService(paymentRepository, customerRepo);
