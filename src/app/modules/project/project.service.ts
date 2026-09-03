import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { IProjectPayload } from "./project.interface";

const createProject = async (payload: IProjectPayload, user: ReqUser) => {
  const { name, description } = payload;
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: true,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.isDeleted || existingUser.status === "DELETED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is deleted, please contact an admin",
    );
  }
  if (existingUser.status === "BLOCKED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is blocked, please contact an admin",
    );
  }
  const manager = await prisma.manager.findUnique({
    where: {
      id: existingUser.managerProfile?.id,
      email: existingUser.managerProfile?.email,
    },
    include: {
      subscription: true,
      payments: true,
    },
  });
  if (!manager) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }
  if (
    manager.subscription?.status !== "ACTIVE" &&
    manager.subscription?.plan !== "PRO"
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your current subscription plan is not Active or your subscription plan is not pro yet sp  kindly purchase subscription then try to create project",
    );
  }
  const createdProject = await prisma.project.create({
    data: {
      name,
      description,
      managerId: manager.id,
    },
    include: {
      manager: true,
      members: true,
      tasks: true,
    },
  });
  return createdProject;
};
const getProjects = async () => {};
const getSingleProject = async () => {};
const updateProject = async () => {};
const deleteProject = async () => {};
const deleteMemberFromProject = async () => {};

export const projectService = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
};
