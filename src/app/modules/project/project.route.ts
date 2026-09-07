import { Router } from "express";

import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { projectController } from "./project.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
  ProjectPayloadSchema,
  ProjectUpdatePayloadSchema,
} from "./project.validation";
import { createTaskSchema } from "../task/task.validation";
import { upload } from "../../lib/multer";

const router = Router();

router.post(
  "/create",
  upload.fields([
    {
      name: "additionalFiles",
      maxCount: 3,
    },
  ]),
  validateRequest(ProjectPayloadSchema),
  auth(Role.MANAGER),
  projectController.createProject,
);
router.get(
  "/get",
  auth(Role.ADMIN, Role.MANAGER, Role.MEMBER),
  projectController.getProjects,
);
router.get(
  "/get/:id",
  auth(Role.ADMIN, Role.MANAGER, Role.MEMBER),
  projectController.getProjects,
);
router.patch(
  "/update/:id",
  validateRequest(ProjectUpdatePayloadSchema),
  auth(Role.MANAGER),
  projectController.updateProject,
);
router.patch("/del/:id", auth(Role.MANAGER), projectController.deleteProject); // soft-delete
router.delete(
  "/del/:id",
  auth(Role.MANAGER),
  projectController.deleteMemberFromProject,
);
router.post(
  "/:id/tasks",
  validateRequest(createTaskSchema),
  auth(Role.MANAGER),
  projectController.createTask,
);
router.get(
  "/:id/tasks",
  auth(Role.MANAGER, Role.MEMBER),
  projectController.getTask,
);

export const projectRouter = router;
