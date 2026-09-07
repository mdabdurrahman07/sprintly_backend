import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { userValidation } from "./auth.validation";
import { authController } from "./auth.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { strictLimiter } from "../../middleware/strictLimiter";

const router = Router();

router.post(
  "/register/member",
  validateRequest(userValidation.RegisterSchema),
  strictLimiter,
  authController.registerMember,
);
router.post(
  "/verifyEmail",
  validateRequest(userValidation.VerifyEmailOTPSchema),
  authController.verifyEmail,
);
router.post(
  "/login",
  validateRequest(userValidation.LoginSchema),
  authController.login,
);
router.get(
  "/me",
  auth(Role.ADMIN, Role.MANAGER, Role.MEMBER),
  authController.getMe,
);
router.post("/refresh-token", authController.refreshToken);
router.post("/google", authController.googleLogin);
router.post(
  "/register/manager",
  validateRequest(userValidation.ManagerRegisterPayloadSchema),
  strictLimiter,
  authController.registerManager,
);
router.post(
  "/verifyEmail/manager",
  validateRequest(userValidation.VerifyEmailOTPSchema),
  authController.verifyManagerEmail,
);

export const authRoutes = router;
