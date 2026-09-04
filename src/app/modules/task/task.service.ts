import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { ICreateTaskInput, IUpdateTaskInput } from "./task.interface";
import { IQuery } from "../../interface";
import { TaskWhereInput } from "../../../../generated/prisma/models";
import { logActivity } from "../../utils/logActivity";
import { TaskStatus } from "../../../../generated/prisma/enums";
import path from "node:path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { config } from "../../config";


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
  await logActivity({
    actorUserId: user.userId,
    action: "Get Assigned Task",
    entityType: "Task",
    entityId: user.userId,
  });
  return task;
};
const getTaskDetails = async (taskId: string, user: ReqUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      memberProfile: true,
      managerProfile: true,
    },
  });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const singleTask = await prisma.task.findUnique({
    where: {
      id: taskId,
      assigneeId: existingUser.memberProfile?.id,
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
  if (!singleTask) {
    throw new AppError(httpStatus.NOT_FOUND, "Single task not found");
  }
  await logActivity({
    actorUserId: user.userId,
    action: "get Single Task",
    entityType: "Task",
    entityId: user.userId,
  });
  return singleTask;
};
const updateTask = async (
  payload: IUpdateTaskInput,
  taskId: string,
  user: ReqUser,
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }
  const existingUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      memberProfile: true,
      managerProfile: true,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const isManager = !!existingUser.managerProfile;
  const isAdmin = user.role === "ADMIN";
  const isPrivileged = isManager || isAdmin;

  const coreFields: (keyof IUpdateTaskInput)[] = [
    "title",
    "description",
    "priority",
    "labels",
  ];
  const hasModifiedCoreField = (
    Object.keys(payload) as (keyof IUpdateTaskInput)[]
  ).some((key) => coreFields.includes(key) && payload[key] !== undefined);
  if (hasModifiedCoreField && !isPrivileged) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only managers or admins can modify core task details.",
    );
  }
  if (payload.status && payload.status !== task.status) {
    const newStatus = payload.status;
    if (newStatus === TaskStatus.DONE && !isPrivileged) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only managers or admins can mark a task as Done.",
      );
    }
    if (!isPrivileged) {
      const validTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
        [TaskStatus.IN_REVIEW]: [TaskStatus.IN_REVIEW],
        [TaskStatus.DONE]: [],
      };
      const allowed = validTransitions[task.status] || [];
      if (!allowed.includes(newStatus)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Invalid status transition from ${task.status} to ${newStatus}`,
        );
      }
    }
  }
  const updatedTask = prisma.task.update({
    where: {
      id: taskId,
    },
    data: payload,
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Task updated",
    entityType: "Task",
    entityId: user.userId,
  });
  return updatedTask;
};
const assignTaskToMember = async (
  taskId: string,
  memberId: string,
) => {
  if (!taskId || !memberId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "TaskId and MemberId are required",
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          name: true,
          manager: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, "Member not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.projectMember.upsert({
      where: {
        projectId_memberId: {
          projectId: task.projectId,
          memberId: memberId,
        },
      },
      update: {},
      create: {
        projectId: task.projectId,
        memberId: memberId,
      },
    });
    return tx.task.update({
      where: { id: taskId },
      data: {
        assigneeId: memberId,
      },
    });
  });
  // ejs
  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/invitation.ejs",
  );

  const templateData = {
    name: member.name,
    projectName: task.project.name,
    email: task.project.manager.email,
    inviterName: task.project.manager.name,
  };

  const html = await ejs.renderFile(templatePath, templateData);
  await transporter.sendMail({
    from: config.email_sender,
    to: member.email,
    subject: "Project Task Invitation",
    html,
  });
  await prisma.task.update({
    where: { id: taskId },
    data: { assignmentNotifiedAt: new Date() },
  });

  return result;
};

export const taskServices = {
  getMyAssignedTask,
  getTaskDetails,
  updateTask,
  assignTaskToMember,
};
