import  httpStatus  from 'http-status';
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authServices } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";

const registerMember = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body
    await authServices.registerUserInDB(payload)
    sendResponse(res, {
        statusCode: httpStatus.OK,
		success: true,
		message: "Verification OTP Sent",
    })
})

export const authController = {
    registerMember
}