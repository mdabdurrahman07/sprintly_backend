import httpStatus from "http-status";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { commentServices } from "./comment.service";
import { sendResponse } from "../../utils/sendResponse";

const addComment = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const user = req.user!;
  const payload = req.body;
  const result = await commentServices.addComment(payload, taskId, user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

const getComments = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const result = await commentServices.getComments(taskId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment fetched successfully",
    data: result,
  });
});
const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const commentId = req.params.id as string;
  const user = req.user!;
  const result = await commentServices.deleteComment(commentId, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

export const commentController = { addComment, getComments, deleteComment };
