import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { taskController } from "./task.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { updateTaskSchema } from "./task.validation";
import { CommentPayloadSchema } from "../comment/comment.validation";
import { commentController } from "../comment/comment.controller";

const router = Router();

router.get(
  "/myAssigned",
  auth(Role.MANAGER, Role.MEMBER),
  taskController.getMyAssignedTask,
);
router.get(
  "/:id",
  auth(Role.MANAGER, Role.MEMBER),
  taskController.getTaskDetails,
);
router.patch("/:id", validateRequest(updateTaskSchema), auth(Role.MANAGER, Role.MEMBER), taskController.updateTask);
router.put("/:id", auth(Role.MANAGER), taskController.assignTaskToMember);
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

export const taskRoutes = router;
