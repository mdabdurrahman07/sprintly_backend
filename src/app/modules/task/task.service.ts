import  httpStatus  from 'http-status';
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth"
import { AppError } from "../../utils/AppError";
import { ICreateTaskInput } from "./task.interface"
import { name } from 'ejs';

const createTask = async (payload: ICreateTaskInput, projectId: string, user:ReqUser) => {
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

  if(existingUser.role !== "MANAGER"){
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create task")
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
      "Your current subscription plan is not Active or your subscription plan is not pro yet sp  kindly purchase subscription then try to create task",
    );
  }
  const createTask = await prisma.task.create({
    data:{
        projectId,
        ...payload
    },
    include:{
      project:{
        select:{
            id: true,
            name: true,
            manager: true
        }
      },
      comments:{
        select:{
            id: true,
            member: true,
            content: true
        }
      },
      assignee: true
    }
  })
  return createTask
}
const getTask = async () => {}
const getMyAssignedTask = async () => {}
const getTaskDetails = async () => {}
const updateTask = async () => {}
const assignTaskToMember = async () => {}

export const taskServices = {
    createTask,
    getTask,
    getMyAssignedTask,
    getTaskDetails,
    updateTask,
    assignTaskToMember
}