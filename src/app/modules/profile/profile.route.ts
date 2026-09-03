import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../lib/multer";
import { profileController } from "./profile.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ManagerProfileUpdateSchema, MemberProfileUpdateSchema } from "./profile.validation";

const router = Router();

router.patch(
	"/update/member",
    validateRequest(MemberProfileUpdateSchema),
	auth(Role.MEMBER),
	upload.single("memberAvatarUrl"),
	profileController.updateMemberProfile,
);
router.patch(
	"/update/manager",
    validateRequest(ManagerProfileUpdateSchema),
	auth(Role.MANAGER),
	upload.single("managerAvatarUrl"),
	profileController.updateManagerProfile,
);

export const profileRoutes = router;
