import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../utils/sendResponse";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await adminService.getAllUsers(query, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All users fetched successfully",
    data: result,
  });
});
const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const user = req.user!;
  const payload = req.body;

  const result = await adminService.updateUserStatus(userId, user, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "user status updated successfully",
    data: result,
  });
});

const adminTotalAnalytics = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const result = await adminService.adminTotalAnalytics(user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "admin total analytics successfully",
    data: result,
  });
});
const getAllProjects = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await adminService.getAllProject(query, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "all projects fetched successfully",
    data: result,
  });
});
const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;
  const result = await adminService.getAuditLogs(query, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "all activity logs fetched successfully",
    data: {},
  });
});

export const adminController = {
  getAllProjects,
  updateUserStatus,
  adminTotalAnalytics,
  getAllUsers,
  getAuditLogs,
};
