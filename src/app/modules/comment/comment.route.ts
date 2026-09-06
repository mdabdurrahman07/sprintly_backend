import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentPayloadSchema } from "./comment.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { commentController } from "./comment.controller";

const router = Router();


router.delete("/:id", auth(Role.MEMBER), commentController.deleteComment);

export const commentRoute = router;
