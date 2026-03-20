import { Router } from "express";
import { TicketBookController } from "./ticket-book.controller";
import { authJwt } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";

const router = Router();
const controller = new TicketBookController();

/**
 * Ticket Book Routes
 * Handles selling and querying ticket books (prepago)
 */

router.post(
  "/sell",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER"]),
  controller.sell
);

router.get(
  "/customer/:customerId",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  controller.getCustomerTickets
);

export { router as ticketBookRoutes };
