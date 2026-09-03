import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentPayloadSchema } from "./comment.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { commentController } from "./comment.controller";

const router = Router();

router.post(
  "/:taskId/comment",
  validateRequest(CommentPayloadSchema),
  auth(Role.MEMBER),
  commentController.addComment,
);
router.get(
  "/:taskId/comments",
  auth(Role.MEMBER, Role.MANAGER),
  commentController.getComments,
);
router.delete(
  "/comments/:id",
  auth(Role.MEMBER),
  commentController.deleteComment,
);
