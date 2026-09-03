import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { ICommentPayload } from "./comment.interface";

const addComment = async (
  payload: ICommentPayload,
  taskId: string,
  user: ReqUser,
) => {
  if (!taskId) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid Id");
  }
  const { content } = payload;
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      assigneeId: user.userId,
    },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }

  const createComment = await prisma.comment.create({
    data: {
      content,
      taskId: task.id,
      memberId: user.userId,
    },
  });
  return createComment;
};
const getComments = async (taskId: string) => {
  if (!taskId) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid Id");
  }
  const taskComment = await prisma.comment.findMany({
    where: {
      taskId,
      deletedAt: null
    },
  });
  if (!taskComment) {
    throw new AppError(httpStatus.NOT_FOUND, "Not comment found");
  }

  return getComments;
};
const deleteComment = async (commentId: string, user: ReqUser) => {
  if (commentId) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid Comment Id");
  }

  const deleteComment = await prisma.comment.delete({
    where: {
      id: commentId,
      memberId: user.userId
    },
  });
  return deleteComment;
};

export const commentServices = { addComment, getComments, deleteComment };
