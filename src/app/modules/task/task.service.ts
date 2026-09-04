import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { ICreateTaskInput } from "./task.interface";
import { IQuery } from "../../interface";
import { TaskWhereInput } from "../../../../generated/prisma/models";
import { logActivity } from "../../utils/logActivity";

const createTask = async (
  payload: ICreateTaskInput,
  projectId: string,
  user: ReqUser,
) => {
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

  if (existingUser.role !== "MANAGER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create task");
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
    data: {
      projectId,
      ...payload,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          manager: true,
        },
      },
      comments: {
        select: {
          id: true,
          member: true,
          content: true,
        },
      },
      assignee: true,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Task created",
    entityType: "Task",
    entityId: user.userId,
  });
  return createTask;
};
const getTask = async (projectId: string, query: IQuery, user: ReqUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: {
        select: {
          id: true,
          email: true,
        },
      },
      memberProfile: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";
  const andConditions: TaskWhereInput[] = [];
  andConditions.push({
    OR: [
      { assigneeId: existingUser?.memberProfile?.id },
      { projectId: projectId },
    ],
  });
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  if (query.status) {
    andConditions.push({
      status: query.status,
    });
  }
  if (query.priority) {
    andConditions.push({
      status: query.priority,
    });
  }
  const task = await prisma.task.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          manager: true,
        },
      },
      comments: {
        select: {
          id: true,
          member: true,
          content: true,
        },
      },
      assignee: true,
    },
  });
  const total = await prisma.task.count({
    where: {
      AND: andConditions,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Task fetched",
    entityType: "Task",
    entityId: user.userId,
  });
  return {
    data: task,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const getMyAssignedTask = async (user: ReqUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      memberProfile: true,
    },
  });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const task = await prisma.task.findMany({
    where: {
      assigneeId: existingUser.memberProfile?.id,
    },
  });
  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }
  return task;
};
const getTaskDetails = async () => {};
const updateTask = async () => {};
const assignTaskToMember = async () => {};

export const taskServices = {
  createTask,
  getTask,
  getMyAssignedTask,
  getTaskDetails,
  updateTask,
  assignTaskToMember,
};
