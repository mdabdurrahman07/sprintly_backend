import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { IProjectPayload, IProjectUpdatePayload } from "./project.interface";
import { IQuery } from "../../interface";
import { ProjectWhereInput, TaskWhereInput } from "../../../../generated/prisma/models";
import { logActivity } from "../../utils/logActivity";
import { ICreateTaskInput } from "../task/task.interface";

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

  if(existingUser.role !== "MANAGER"){
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can create project")
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
  await logActivity({
    actorUserId: user.userId,
    action: "Project created",
    entityType: "Project",
    entityId: user.userId,
  })
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
      memberProfile: true
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

  const andConditions: ProjectWhereInput[] = [];
  andConditions.push({
    OR: [
      { managerId: existingUser.managerProfile?.id },
      { members: { some: { memberId: existingUser.memberProfile?.id} } },
    ],
  });
  if (query.status) {
    andConditions.push({
      status: query.status,
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
  })
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
      memberProfile: true
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      OR: [
        { managerId: existingUser.managerProfile?.id },
        { members: { some: { memberId: existingUser.memberProfile?.id } } },
      ],
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
   await logActivity({
    actorUserId: user.userId,
    action: "Single Project fetched",
    entityType: "Project",
    entityId: projectId,
  })
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

  if(existingUser.role !== "MANAGER"){
    throw new AppError(httpStatus.FORBIDDEN, "Only manager can update project")
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
  })
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
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: existingUser.managerProfile?.id,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const softDelete = await prisma.project.update({
    where: {
      id: project.id,
      managerId: existingUser.managerProfile?.id,
    },
    data: {
      deletedAt: new Date(),
      isDeleted: true,
    },
  });
   await logActivity({
    actorUserId: user.userId,
    action: "Project deleted(soft-delete)",
    entityType: "Project",
    entityId: projectId,
  })
  return softDelete;
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
      memberProfile: true
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: existingUser.managerProfile?.id,
    }
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const deleteMember = await prisma.projectMember.delete({
    where: {
      projectId_memberId: {
        projectId: project.id,
        memberId: memberId,
      },
    },
  });
   await logActivity({
    actorUserId: user.userId,
    action: "Member deleted from Project",
    entityType: "Project",
    entityId: memberId,
  })
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

export const projectService = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
  createTask,
  getTask
};

// TODO
// * select only id and email of existingUser