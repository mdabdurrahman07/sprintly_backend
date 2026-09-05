import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { planService } from "./plan.service";
import { sendResponse } from "../../utils/sendResponse";

const createPlan = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const result = await planService.createPlan(user, payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "plan created successfully",
    data: result,
  });
});
const getPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await planService.getPlan();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "plan fetched successfully",
    data: result,
  });
});
const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const planId = req.params.id as string;
  const result = await planService.updatePlan(user, payload, planId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "plan updated successfully",
    data: result,
  });
});
const deletePlan = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const planId = req.params.id as string;
  await planService.deletePlan(user, planId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "plan deleted successfully",
  });
});

export const planController = {
  createPlan,
  getPlan,
  updatePlan,
  deletePlan,
};
