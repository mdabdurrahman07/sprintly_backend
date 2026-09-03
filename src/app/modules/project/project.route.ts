import { Router } from "express";

import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { projectController } from "./project.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ProjectPayloadSchema, ProjectUpdatePayloadSchema } from "./project.validation";

const router = Router()

router.post("/create", validateRequest(ProjectPayloadSchema),auth(Role.MANAGER), projectController.createProject)
router.get("/get", auth(Role.ADMIN, Role.MANAGER, Role.MEMBER), projectController.getProjects)
router.get("/get/:id", auth(Role.ADMIN, Role.MANAGER, Role.MEMBER), projectController.getProjects)
router.patch("update/:id", validateRequest(ProjectUpdatePayloadSchema), auth(Role.MANAGER), projectController.updateProject)
router.post("del/:id", auth(Role.MANAGER), projectController.deleteProject) // soft-delete
router.delete("/del/:id", auth(Role.MANAGER), projectController.deleteMemberFromProject)