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

const paymentCallback = catchAsync(async (req:Request, res: Response) => {
  const {redirectUrl} = await paymentService.createdPaymentCallBack(req.query)
  res.redirect(redirectUrl)
});

const getMyPayment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await paymentService.getMyPayment(user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment data fetched successfully",
    data: result,
  });
});

export const paymentController = {
    createPayment,
    paymentCallback,
    getMyPayment
}