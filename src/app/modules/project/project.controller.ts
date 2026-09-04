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
  const user = req.user!
  const result = await projectService.getProjects(user, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Projects fetched successfully",
    data: result,
  });
});

const getSingleProject = catchAsync(async (req: Request, res: Response) => {
  const projectId = req.params.id as string
  const user = req.user!
  const result = await projectService.getSingleProject(projectId, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project fetched successfully",
    data: result,
  });
});

const updateProject = catchAsync(async (req: Request, res: Response) => {
  const projectId = req.params.id as string
  const payload = req.body
  const user = req.user!
  const result = await projectService.updateProject(projectId, payload, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project updated successfully",
    data: result,
  });
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
   const projectId = req.params.id as string
  const user = req.user!
  await projectService.deleteProject(projectId, user);
  sendResponse(res, {
    statusCode: httpStatus.NO_CONTENT,
    success: true,
    message: "Project deleted successfully",
  });
});

const deleteMemberFromProject = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!
    const projectId = req.params.id as string
    const memberId = req.body
    await projectService.deleteMemberFromProject(user, memberId, projectId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Member removed from project successfully",
    });
  },
);
const createTask = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body
    const projectId = req.params.id as string
    const user  = req.user!
  const result = await projectService.createTask(payload, projectId, user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Task is created",
    data: result,
  });
});
const getTask = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!
  const query = req.query
  const projectId = req.params.id as string
  const result = await projectService.getTask(projectId, query, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task fetched successfully",
    data: result,
  });
});

export const projectController = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
  createTask,
  getTask
};
