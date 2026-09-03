import  httpStatus  from 'http-status';
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { userServices } from './profile.service';
import { sendResponse } from '../../utils/sendResponse';

const updateMemberProfile = catchAsync(async (req: Request, res: Response) => {
     const payload= req.body
      const user = req.user
     const imageBuffer = req.file ? req.file.buffer : undefined;
      if(!user){
          throw new AppError(httpStatus.UNAUTHORIZED, "You need to log in first")
     }

      const response = await userServices.updateMemberProfile(payload, user, imageBuffer)
     sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Member profile updated successfully",
			data: response,
		});
})
const updateManagerProfile = catchAsync(async (req: Request, res: Response) => {
     const payload= req.body
      const user = req.user
     const imageBuffer = req.file ? req.file.buffer : undefined;
      if(!user){
          throw new AppError(httpStatus.UNAUTHORIZED, "You need to log in first")
     }

      const response = await userServices.updateManagerProfile(payload, user, imageBuffer)
     sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Manager profile updated successfully",
			data: response,
		});
})

export const profileController = {
    updateMemberProfile,
    updateManagerProfile
}
