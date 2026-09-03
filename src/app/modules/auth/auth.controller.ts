import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authServices } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";

const registerMember = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  await authServices.registerUserInDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification OTP Sent",
  });
});
const login = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authServices.login(payload);
  const { accessToken, refreshToken } = result;
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
    message: "Login Successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
});
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authServices.verifyUserEmailAndStoreUserInDB(payload);
  const { accessToken, refreshToken, user, memberProfile } = result;
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
  });
});
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as unknown as ReqUser;
  if (!user) {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      "User information is missing or User need to login first",
    );
  }
  const result = await authServices.getMe(user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched",
    data: result,
  });
});
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.cookies.refreshToken) {
    throw new AppError(httpStatus.NOT_FOUND, "Refresh token is missing");
  }

  const result = await authServices.refreshToken(req.cookies.refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = result;
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
  });
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});
const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body
  const result = await authServices.googleLogin(payload)
  const {accessToken, refreshToken} = result
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
  sendResponse(res,{
    statusCode: httpStatus.OK,
    success: true,
    message: "Google Login Successful",
    data: result
  })
})
const registerManager = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  await authServices.registerManagerInDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification OTP Sent",
  });
});
const verifyManagerEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authServices.verifyManagerEmailAndStoreUserInDB(payload);
  const { accessToken, refreshToken, user, managerProfile } = result;
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
      managerProfile,
    },
  });
});


export const authController = {
  registerMember,
  verifyEmail,
  login,
  getMe,
  refreshToken,
  googleLogin,
  registerManager,
  verifyManagerEmail
};
