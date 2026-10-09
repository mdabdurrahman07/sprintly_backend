import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { IProjectPayload, IProjectUpdatePayload } from "./project.interface";
import { IQuery } from "../../interface";
import {
  ProjectWhereInput,
  TaskWhereInput,
} from "../../../../generated/prisma/models";
import { logActivity } from "../../utils/logActivity";
import { ICreateTaskInput } from "../task/task.interface";
import { isSubscriptionActive } from "../../utils/helper";
import { uploadDocumentsOnCloudinary } from "../../lib/cloudinary";
import { PROJECT_LIMITS } from "../../utils/projectLimiter";
import { SubscriptionPlan } from "../../../../generated/prisma/enums";

const MAX_PAGE_SIZE = 100;
const SORTABLE_TASK_FIELDS = [
  "createdAt",
  "updatedAt",
  "priority",
  "status",
  "title",
] as const;

const getProjectAccessFilter = (user: {
  role: string;
  managerProfile: { id: string } | null;
  memberProfile: { id: string } | null;
}): ProjectWhereInput => {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") {
    if (!user.managerProfile) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }
    return { managerId: user.managerProfile.id };
  }
  if (user.role === "MEMBER") {
    if (!user.memberProfile) {
      throw new AppError(httpStatus.FORBIDDEN, "Member profile not found");
    }
    return { members: { some: { memberId: user.memberProfile.id } } };
  }
  throw new AppError(httpStatus.FORBIDDEN, "Unsupported user role");
};

const createProject = async (
  payload: IProjectPayload,
  user: ReqUser,
  additionalFiles: Express.Multer.File[],
) => {
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

  if (existingUser.role !== "MANAGER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create project");
  }
  if (!existingUser.managerProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
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
      subscription: {
        include: {
          plan: true,
        },
      },
      payments: true,
    },
  });
  if (!manager) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }
  const hasActiveSubscription = isSubscriptionActive(manager.subscription);
  if (!hasActiveSubscription) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your current subscription is not active or has expired. Please purchase a valid subscription to create projects.",
    );
  }
  const plan = manager.subscription?.plan;
  if (plan) {
    const planName = plan.name as SubscriptionPlan; 
    const limit = PROJECT_LIMITS[planName] ?? 0;

    const projectCount = await prisma.project.count({
      where: {
        managerId: manager.id,
      },
    });

    if (projectCount >= limit) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Your ${planName} plan allows a maximum of ${limit} projects. You have already reached your limit.`,
      );
    }
  }
  const additionalFileResult = additionalFiles.length
    ? await uploadDocumentsOnCloudinary(additionalFiles)
    : [];
  const createdProject = await prisma.project.create({
    data: {
      name,
      description,
      managerId: manager.id,
      additionalFiles: additionalFileResult.map((file) => ({
        url: file.url,
        publicId: file.publicId,
      })),
    },
    include: {
      manager: true,
      members: true,
      tasks: true,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Project created",
    entityType: "Project",
    entityId: user.userId,
  });
  return createdProject;
};
const getProjects = async (user: ReqUser, query: IQuery) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: true,
      memberProfile: true,
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

  const andConditions: ProjectWhereInput[] = [
    getProjectAccessFilter(existingUser),
  ];
  if (query.status) {
    andConditions.push({
      status: query.status,
    });
  }
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }
  const projects = await prisma.project.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          managerAvatarUrl: true,
        },
      },
      members: {
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              memberAvatarUrl: true,
            },
          },
        },
      },
      tasks: {
        where: {
          deletedAt: null,
        },
      },
    },
  });
  const total = await prisma.project.count({
    where: {
      AND: andConditions,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Project fetched",
    entityType: "Project",
    entityId: user.userId,
  });
  return {
    data: projects,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const getSingleProject = async (projectId: string, user: ReqUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: true,
      memberProfile: true,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...getProjectAccessFilter(existingUser),
    },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          managerAvatarUrl: true,
        },
      },
      members: {
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              memberAvatarUrl: true,
            },
          },
        },
      },
      tasks: {
        where: {
          deletedAt: null,
        },
      },
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }
  await logActivity({
    actorUserId: user.userId,
    action: "Single Project fetched",
    entityType: "Project",
    entityId: projectId,
  });
  return project;
};
const updateProject = async (
  projectId: string,
  user: ReqUser,
  payload: IProjectUpdatePayload,
) => {
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

  if (existingUser.role !== "MANAGER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create project");
  }
  if (!existingUser.managerProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
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
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: existingUser.managerProfile?.id,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const updatedProject = await prisma.project.update({
    where: {
      id: project.id,
      managerId: existingUser.managerProfile?.id,
    },
    data: {
      name,
      description,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Project updated",
    entityType: "Project",
    entityId: projectId,
  });
  return updatedProject;
};
const deleteProject = async (projectId: string, user: ReqUser) => {
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
  if (existingUser.role !== "MANAGER" || !existingUser.managerProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
  }
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: existingUser.managerProfile?.id,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const Delete = await prisma.project.delete({
    where: {
      id: project.id,
      managerId: existingUser.managerProfile?.id,
    }
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Project deleted",
    entityType: "Project",
    entityId: projectId,
  });
  return Delete;
};
const deleteMemberFromProject = async (
  user: ReqUser,
  memberId: string,
  projectId: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: true,
      memberProfile: true,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

    if (existingUser.role !== "MANAGER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create project");
  }
  if (!existingUser.managerProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
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
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: existingUser.managerProfile?.id,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const deleteMember = await prisma.projectMember.delete({
    where: {
      projectId_memberId: {
        projectId: projectId,
        memberId: memberId,
      },
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Member deleted from Project",
    entityType: "Project",
    entityId: memberId,
  });
  return deleteMember;
};
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
  if (!existingUser.managerProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
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
  const hasActiveSubscription = isSubscriptionActive(manager.subscription);
  if (!hasActiveSubscription) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your current subscription is not active or has expired. Please purchase a valid subscription to create projects.",
    );
  }
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: manager.id,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const createTask = await prisma.task.create({
    data: {
      projectId: project.id,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      labels: payload.labels,
      assigneeId: payload.assigneeId,
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
  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;
  const sortBy =
    SORTABLE_TASK_FIELDS.find((field) => field === query.sortBy) ?? "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  let scope: TaskWhereInput;
  if (existingUser.role === "MANAGER") {
    const managerId = existingUser.managerProfile?.id;
    if (!managerId) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }
    scope = { projectId, project: { managerId } };
  } else if (existingUser.role === "MEMBER") {
    const memberId = existingUser.memberProfile?.id;
    if (!memberId) {
      throw new AppError(httpStatus.FORBIDDEN, "Member profile not found");
    }
    scope = { projectId, assigneeId: memberId };
  } else {
    scope = { projectId };
  }

  const andConditions: TaskWhereInput[] = [scope, { isDeleted: false }];
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        {
          description: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }
  if (query.status) andConditions.push({ status: query.status });
  if (query.priority) andConditions.push({ priority: query.priority });
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

export const projectService = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
  createTask,
  getTask,
};
