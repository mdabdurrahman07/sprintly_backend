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

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body
    const result = await authServices.verifyUserEmailAndStoreUserInDB(payload)
    const {accessToken, refreshToken, user, memberProfile} = result
    res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
		success: true,
		message: "Email Verified Successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			memberProfile,
		},
    })
})

export const authController = {
    registerMember,
    verifyEmail
}