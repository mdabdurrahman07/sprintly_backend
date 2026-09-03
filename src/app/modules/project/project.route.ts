import { Router } from "express";

import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { projectController } from "./project.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ProjectPayloadSchema } from "./project.validation";

const router = Router()

router.post("/create", validateRequest(ProjectPayloadSchema),auth(Role.MANAGER), projectController.createProject)
router.get("/get", auth(Role.ADMIN, Role.MANAGER, Role.MEMBER), projectController.getProjects)
router.get("/get/:id", auth(Role.ADMIN, Role.MANAGER, Role.MEMBER), projectController.getProjects)