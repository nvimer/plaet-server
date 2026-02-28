import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpStatus } from "../../utils/httpStatus.enum";
import paymentService from "./payment.service";

class PaymentController {
  createPayment = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const data = req.body;

    const payment = await paymentService.createPayment(orderId, data);

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Payment registered successfully",
      data: payment,
    });
  });
}

export default new PaymentController();
