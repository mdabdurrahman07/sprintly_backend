import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { ICommentPayload } from "./comment.interface";
import { logActivity } from "../../utils/logActivity";

const addComment = async (
  payload: ICommentPayload,
  taskId: string,
  user: ReqUser,
) => {
  if (!taskId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid task ID");
  }

  const { content } = payload;

  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
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

  if (existingUser.role !== "MEMBER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only members can add comments");
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

  const member = await prisma.member.findUnique({
    where: { id: existingUser.memberProfile?.id },
  });

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, "Member not found");
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,
    },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }

  const assignment = await prisma.taskAssignment.findUnique({
    where: {
      taskId_memberId: {
        taskId: taskId,
        memberId: member.id,
      },
    },
  });

  if (!assignment) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this task",
    );
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId: task.id,
      memberId: member.id,
    },
  });

  await logActivity({
    actorUserId: user.userId,
    action: "Comment created",
    entityType: "Comment",
    entityId: comment.id,
  });

  return comment;
};
const getComments = async (taskId: string) => {
  if (!taskId) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid Id");
  }
  const taskComment = await prisma.comment.findMany({
    where: {
      taskId,
      deletedAt: null,
    },
  });
  if (!taskComment) {
    throw new AppError(httpStatus.NOT_FOUND, "Not comment found");
  }

  return taskComment;
};
const deleteComment = async (commentId: string, user: ReqUser) => {
  if (!commentId) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid Comment Id");
  }
   const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
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

  if (existingUser.role !== "MEMBER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only members can add comments");
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

  const member = await prisma.member.findUnique({
    where: { id: existingUser.memberProfile?.id },
  });

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, "Member not found");
  }

  const deleteComment = await prisma.comment.delete({
    where: {
      id: commentId,
      memberId: member.id
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Comment deleted",
    entityType: "Comment",
    entityId: deleteComment.id,
  });
  return deleteComment;
};

export const commentServices = { addComment, getComments, deleteComment };
