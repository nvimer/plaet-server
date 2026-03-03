import { Router } from "express";
import paymentController from "./payment.controller";
import { authJwt } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { RoleName } from "@prisma/client";

const router = Router();

router.post(
  "/:orderId",
  authJwt,
  roleMiddleware([RoleName.CASHIER, RoleName.ADMIN, RoleName.SUPERADMIN]),
  paymentController.createPayment,
);

export default router;
