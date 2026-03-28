import { Request, Response, NextFunction } from "express";
import { TicketBookService } from "./ticket-book.service";
import { sellTicketBookSchema } from "./ticket-book.validator";
import { AuthenticatedUser } from "../../types/express";
import { HttpStatus } from "../../utils/httpStatus.enum";

export class TicketBookController {
  private service: TicketBookService;

  constructor() {
    this.service = new TicketBookService();
  }

  sell = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = sellTicketBookSchema.parse(req.body);
      const user = req.user as AuthenticatedUser;
      
      const ticketBook = await this.service.sellTicketBook(
        data.body,
        user.restaurantId!
      );

      res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Tiquetera vendida exitosamente",
        data: ticketBook,
      });
    } catch (error) {
      next(error);
    }
  };

  getCustomerTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const tickets = await this.service.getCustomerTickets(customerId);
      
      res.status(HttpStatus.OK).json({
        success: true,
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  };
}
