import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { taskServices } from "./task.service";

const createTask = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body
    const projectId = req.params.id as string
    const user  = req.user!
  const result = await taskServices.createTask(payload, projectId, user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Task is created",
    data: result,
  });
});
const getTask = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.getTask();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task fetched successfully",
    data: result,
  });
});
const getMyAssignedTask = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.getMyAssignedTask();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your assigned tasks fetched successfully",
    data: result,
  });
});
const getTaskDetails = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.id as string; 
  const result = await taskServices.getTaskDetails();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task details fetched successfully",
    data: result,
  });
});
const assignTaskToMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { memberId } = req.body;
  const result = await taskServices.assignTaskToMember();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task assigned successfully",
    data: result,
  });
});
const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const result = await taskServices.updateTask();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task updated successfully",
    data: result,
  });
});

export const taskController = {
  createTask,
  getTask,
  getMyAssignedTask,
  getTaskDetails,
  updateTask,
  assignTaskToMember,
};