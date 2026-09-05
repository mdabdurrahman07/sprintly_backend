import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { paymentService } from "./payment.service";
import { sendResponse } from "../../utils/sendResponse";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const result = await paymentService.createPayment(user, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated Bkash Callback URL Successfully",
    data: result,
  });
});

export const paymentController = {
    createPayment
}