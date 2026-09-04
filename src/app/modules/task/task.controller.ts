import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { taskServices } from "./task.service";


const getMyAssignedTask = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!
  const result = await taskServices.getMyAssignedTask(user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your assigned tasks fetched successfully",
    data: result,
  });
});
const getTaskDetails = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.id as string; 
  const user = req.user!
  const result = await taskServices.getTaskDetails(taskId, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task details fetched successfully",
    data: result,
  });
});
const updateTask = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.id as string
  const user = req.user!
  const payload = req.body
  const result = await taskServices.updateTask(payload, taskId, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task updated successfully",
    data: result,
  });
});
const assignTaskToMember = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.id as string;
  const memberId = req.body;
  const result = await taskServices.assignTaskToMember(taskId, memberId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task assigned successfully",
    data: result,
  });
});

export const taskController = {
  getMyAssignedTask,
  getTaskDetails,
  updateTask,
  assignTaskToMember,
};