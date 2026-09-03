import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { projectService } from "./project.service";

const createProject = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body
  const user = req.user!
  const result = await projectService.createProject(payload, user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Project created successfully",
    data: result,
  });
});
const getProjects = catchAsync(async (req: Request, res: Response) => {
  const result = await projectService.getProjects();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Projects fetched successfully",
    data: result,
  });
});

const getSingleProject = catchAsync(async (req: Request, res: Response) => {
  const result = await projectService.getSingleProject();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project fetched successfully",
    data: result,
  });
});

const updateProject = catchAsync(async (req: Request, res: Response) => {
  const result = await projectService.updateProject();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project updated successfully",
    data: result,
  });
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  await projectService.deleteProject();
  sendResponse(res, {
    statusCode: httpStatus.NO_CONTENT,
    success: true,
    message: "Project deleted successfully",
  });
});

const deleteMemberFromProject = catchAsync(
  async (req: Request, res: Response) => {
    await projectService.deleteMemberFromProject();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Member removed from project successfully",
    });
  },
);

export const projectController = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
};
