import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { taskController } from "./task.controller";

const router = Router()

router.get("/myAssigned", auth(Role.MANAGER, Role.MEMBER), taskController.getMyAssignedTask)
router.get("/id", auth(Role.MANAGER, Role.MEMBER), taskController.getTaskDetails)
router.patch("/id", auth(Role.MANAGER, Role.MEMBER), taskController.updateTask)
router.put("/id", auth(Role.MANAGER), taskController.updateTask)
