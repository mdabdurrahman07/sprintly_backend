import { Router } from "express";
import { adminController } from "./admin.controller";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { IUserStatusSchema } from "./admin.validation";

const router = Router();

router.get("/users", auth(Role.ADMIN), adminController.getAllUsers);
router.patch(
  "/users/:id/status",
  auth(Role.ADMIN),
  validateRequest(IUserStatusSchema),
  adminController.updateUserStatus,
);
router.get("/analytics", auth(Role.ADMIN), adminController.adminTotalAnalytics);
router.get("/projects", auth(Role.ADMIN), adminController.getAllProjects);
router.get("/audit", auth(Role.ADMIN), adminController.getAuditLogs);

export const adminRoutes = router;
