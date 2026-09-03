import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { IProjectPayload, IProjectUpdatePayload } from "./project.interface";
import { IQuery } from "../../interface";
import { ProjectWhereInput } from "../../../../generated/prisma/models";

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
const getProjects = async (user: ReqUser, query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: ProjectWhereInput[] = [];
  andConditions.push({
    OR: [
      { managerId: user.userId },
      { members: { some: { memberId: user.userId } } },
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
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      OR: [
        { managerId: user.userId },
        { members: { some: { memberId: user.userId } } },
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
      managerId: user.userId,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const updatedProject = await prisma.project.update({
    where: {
      id: project.id,
      managerId: user.userId,
    },
    data: {
      name,
      description,
    },
  });
  return updatedProject;
};
const deleteProject = async (projectId: string, user: ReqUser) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: user.userId,
    },
  });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "No project found");
  }
  const softDelete = await prisma.project.update({
    where: {
      id: project.id,
      managerId: user.userId,
    },
    data: {
      deletedAt: new Date(),
      isDeleted: true,
    },
  });
  return softDelete;
};
const deleteMemberFromProject = async (
  user: ReqUser,
  memberId: string,
  projectId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      managerId: user.userId,
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
  return deleteMember;
};

export const projectService = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  deleteMemberFromProject,
};
