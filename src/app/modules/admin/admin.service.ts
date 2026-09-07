import httpStatus from "http-status";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import {
  ActivityLogWhereInput,
  ProjectWhereInput,
  UserWhereInput,
} from "../../../../generated/prisma/models";
import { IUserStatus } from "./admin.interface";
import { Role } from "../../../../generated/prisma/enums";

const getAllUsers = async (query: IQuery, user: ReqUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: UserWhereInput[] = [];
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admin can create project");
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

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }
  if (query.role) {
    andConditions.push({
      role: query.role,
    });
  }
  const users = await prisma.user.findMany({
    where: {
      AND: andConditions,
      deletedAt: null,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      memberProfile: true,
      managerProfile: true,
    },
    omit: {
      password: true,
    },
  });
  const total = await prisma.user.count({
    where: {
      AND: andConditions,
    },
  });
  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const updateUserStatus = async (
  userId: string,
  user: ReqUser,
  payload: IUserStatus,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admin can create project");
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

  if (!userId) {
    throw new AppError(httpStatus.NOT_FOUND, "UserId not found");
  }

  const changeStatus = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status: payload.status,
    },
  });

  if (!changeStatus) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Something went wrong, status not changed",
    );
  }

  return changeStatus;
};
const adminTotalAnalytics = async (user: ReqUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admin can create project");
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
  const totalRevenueResult = await prisma.payment.aggregate({
    where: {
      status: "SUCCESS",
    },
    _sum: {
      amount: true,
    },
  });
  const usersCount = await prisma.user.count({
    where: {
      deletedAt: null,
    },
  });
  const totalMembers = await prisma.user.count({
    where: {
      role: Role.MEMBER,
      deletedAt: null,
    },
  });
  const totalManagers = await prisma.user.count({
    where: {
      role: Role.MANAGER,
      deletedAt: null,
    },
  });
  return {
    totalRevenueResult,
    totalMembers,
    totalManagers,
    usersCount,
  };
};
const getAllProject = async (query: IQuery, user: ReqUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: ProjectWhereInput[] = [];
  if (query.status) {
    andConditions.push({
      name: query.status,
    });
  }
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admin can create project");
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
  const projects = await prisma.project.findMany({
    where: {
      AND: andConditions,
      deletedAt: null,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      tasks: true,
      manager: true,
      members: true,
    },
  });
  const total = await prisma.project.count({
    where: {
      AND: andConditions,
    },
  });
  return projects;
};
const getAuditLogs = async (query: IQuery, user: ReqUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: ActivityLogWhereInput[] = [];
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admin can create project");
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

  if (query.searchTerm) {
    andConditions.push({
      action: { contains: query.search, mode: "insensitive" },
    });
  }
  if (query.entityType) {
    andConditions.push({
      entityType: query.entityType,
    });
  }
  const auditLogs = await prisma.activityLog.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      actor: true,
    },
  });
  return auditLogs;
};

export const adminService = {
  getAllUsers,
  updateUserStatus,
  adminTotalAnalytics,
  getAllProject,
  getAuditLogs
};
